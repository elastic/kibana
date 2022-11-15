/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useMemo, useEffect, useCallback } from 'react';

import useObservable from 'react-use/lib/useObservable';
import { firstValueFrom } from 'rxjs';
import { DataView } from '@kbn/data-views-plugin/common';
import { EuiSpacer, EuiSelect, EuiFormRow, EuiAccordion, EuiCodeBlock } from '@elastic/eui';

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { i18n } from '@kbn/i18n';
import { useMlKibana } from '../../../../contexts/kibana';
import { RUNNING_STATE } from './inference_base';
import type { InferrerType } from '.';

interface Props {
  inferrer: InferrerType;
  data: ReturnType<typeof useIndexInput>;
}

export const InferenceInputFormIndexControls: FC<Props> = ({ inferrer, data }) => {
  const {
    dataViewListItems,
    fieldNames,
    selectedDataViewId,
    setSelectedDataViewId,
    selectedField,
    setSelectedField,
  } = data;

  const runningState = useObservable(inferrer.getRunningState$());
  const inputComponent = useMemo(() => inferrer.getInputComponent(), [inferrer]);

  return (
    <>
      <EuiFormRow label="Index">
        <EuiSelect
          options={dataViewListItems}
          value={selectedDataViewId}
          onChange={(e) => setSelectedDataViewId(e.target.value)}
          hasNoInitialSelection={true}
          disabled={runningState === RUNNING_STATE.RUNNING}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('xpack.ml.trainedModels.testModelsFlyout.indexInput.fieldInput', {
          defaultMessage: 'Field',
        })}
      >
        <EuiSelect
          options={fieldNames}
          value={selectedField}
          onChange={(e) => setSelectedField(e.target.value)}
          hasNoInitialSelection={true}
          disabled={runningState === RUNNING_STATE.RUNNING}
        />
      </EuiFormRow>

      <>{inputComponent}</>

      <EuiSpacer size="m" />

      <EuiAccordion
        id={'simpleAccordionId'}
        buttonContent={i18n.translate(
          'xpack.ml.trainedModels.testModelsFlyout.indexInput.viewPipeline',
          {
            defaultMessage: 'View pipeline',
          }
        )}
      >
        <EuiCodeBlock language="json" fontSize="s" paddingSize="s" lineNumbers isCopyable={true}>
          {JSON.stringify(inferrer.getPipeline(), null, 2)}
        </EuiCodeBlock>
      </EuiAccordion>
    </>
  );
};

export function useIndexInput({ inferrer }: { inferrer: InferrerType }) {
  const {
    services: {
      data: {
        dataViews,
        search: { search },
      },
    },
  } = useMlKibana();

  const [dataViewListItems, setDataViewListItems] = useState<
    Array<{ value: string; text: string }>
  >([]);
  const [selectedDataViewId, setSelectedDataViewId] = useState<string | undefined>(undefined);
  const [selectedDataView, setSelectedDataView] = useState<DataView | null>(null);
  const [fieldNames, setFieldNames] = useState<Array<{ value: string; text: string }>>([]);
  const [selectedField, setSelectedField] = useState<string | undefined>(undefined);

  useEffect(
    function loadDataViewListItems() {
      dataViews.getIdsWithTitle().then((items) => {
        setDataViewListItems(
          items
            .sort((a, b) => a.title.localeCompare(b.title))
            .map(({ id, title }) => ({ text: title, value: id }))
        );
      });
    },
    [dataViews]
  );

  useEffect(
    function loadSelectedDataView() {
      inferrer.reset();
      setFieldNames([]);
      setSelectedField(undefined);
      if (selectedDataViewId !== undefined) {
        dataViews.get(selectedDataViewId).then((dv) => setSelectedDataView(dv));
      }
    },
    [selectedDataViewId, dataViews, inferrer]
  );

  const loadExamples = useCallback(() => {
    inferrer.setInputText([]);
    if (selectedField !== undefined && selectedDataView !== null) {
      firstValueFrom(
        search({
          params: {
            index: selectedDataView.getIndexPattern(),
            body: {
              fields: [selectedField],
              query: {
                function_score: {
                  functions: [
                    {
                      random_score: {},
                    },
                  ],
                },
              },
            },
          },
        })
      ).then((resp) => {
        const tempExamples = resp.rawResponse.hits.hits
          .filter(({ fields }) => isPopulatedObject(fields, [selectedField]))
          .map(({ fields }) => fields![selectedField][0]);
        inferrer.setInputText(tempExamples);
      });
    }
  }, [inferrer, selectedField, selectedDataView, search]);

  useEffect(
    function loadFieldNames() {
      if (selectedDataView !== null) {
        const tempFieldNames = selectedDataView.fields
          .filter(
            ({ displayName, esTypes, count }) =>
              esTypes && esTypes.includes('text') && !['_id', '_index'].includes(displayName)
          )
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
          .map(({ displayName }) => ({
            value: displayName,
            text: displayName,
          }));
        setFieldNames(tempFieldNames);
        if (tempFieldNames.length === 1) {
          const fieldName = tempFieldNames[0].value;
          setSelectedField(fieldName);
          inferrer.setInputField(fieldName);
        }
      }
    },
    [selectedDataView, inferrer]
  );

  useEffect(
    function loadExamplesAfterFieldChange() {
      loadExamples();
    },
    [selectedField, loadExamples]
  );

  function reloadExamples() {
    inferrer.reset();
    loadExamples();
  }

  return {
    fieldNames,
    dataViewListItems,
    reloadExamples,
    selectedDataViewId,
    setSelectedDataViewId,
    selectedField,
    setSelectedField,
  };
}
