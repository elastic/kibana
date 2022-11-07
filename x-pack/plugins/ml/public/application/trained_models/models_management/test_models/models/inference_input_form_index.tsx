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
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiSpacer,
  EuiButton,
  EuiButtonEmpty,
  // EuiTabs,
  // EuiTab,
  EuiSelect,
  // EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiAccordion,
  EuiCodeBlock,
  EuiText,
} from '@elastic/eui';

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { useMlKibana } from '../../../../contexts/kibana';
import { extractErrorMessage } from '../../../../../../common/util/errors';
import { ErrorMessage } from '../inference_error';
// import { OutputLoadingContent } from '../output_loading';
import { RUNNING_STATE } from './inference_base';
// import { RawOutput } from './raw_output';
import type { InferrerType } from '.';

interface Props {
  inferrer: InferrerType;
}

// enum TAB {
//   TEXT,
//   RAW,
// }

export const InferenceInputFormIndex: FC<Props> = ({ inferrer }) => {
  const {
    services: {
      data: {
        dataViews,
        search: { search },
      },
      // application: { capabilities },
    },
  } = useMlKibana();

  // const [selectedTab, setSelectedTab] = useState(TAB.TEXT);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [dataViewListItems, setDataViewListItems] = useState<
    Array<{ value: string; text: string }>
  >([]);
  const [selectedDataViewId, setSelectedDataViewId] = useState<string | undefined>(undefined);
  const [selectedDataView, setSelectedDataView] = useState<DataView | null>(null);
  const [fieldNames, setFieldNames] = useState<Array<{ value: string; text: string }>>([]);
  const [selectedField, setSelectedField] = useState<string | undefined>(undefined);
  const [examples, setExamples] = useState<string[]>([]);

  const runningState = useObservable(inferrer.runningState$);
  // const inputText = useObservable(inferrer.inputText$) ?? [];
  const inputComponent = useMemo(() => inferrer.getInputComponent(), [inferrer]);
  const outputComponent = useMemo(() => inferrer.getOutputComponent(), [inferrer]);
  const infoComponent = useMemo(() => inferrer.getInfoComponent(), [inferrer]);

  useEffect(() => {
    setFieldNames([]);
    setDataViewListItems([]);
    dataViews.getIdsWithTitle().then((items) => {
      setDataViewListItems(items.map(({ id, title }) => ({ text: title, value: id })));
    });
  }, [dataViews]);

  useEffect(() => {
    setFieldNames([]);
    setSelectedField(undefined);
    inferrer.setInputField(undefined);
    if (selectedDataViewId !== undefined) {
      dataViews.get(selectedDataViewId).then((dv) => setSelectedDataView(dv));
    }
  }, [selectedDataViewId, dataViews, inferrer]);

  useEffect(() => {
    if (selectedDataView !== null) {
      const fieldNames2 = selectedDataView.fields
        .filter(
          ({ displayName, esTypes, count }) =>
            esTypes && esTypes.includes('text') && !['_id', '_index'].includes(displayName)
        )
        .map(({ displayName }) => ({
          value: displayName,
          text: displayName,
        }));
      setFieldNames(fieldNames2);
      if (fieldNames2.length === 1) {
        const fieldName = fieldNames2[0].value;
        setSelectedField(fieldName);
        inferrer.setInputField(fieldName);
      }
    }
  }, [selectedDataView, selectedDataViewId, inferrer]);

  const loadExamples = useCallback(() => {
    setExamples([]);
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
        setExamples(
          resp.rawResponse.hits.hits
            .filter(({ fields }) => isPopulatedObject(fields, [selectedField]))
            .map(({ fields }) => fields![selectedField][0])
        );
      });
    }
  }, [selectedField, selectedDataView, search]);

  function clearResults() {
    loadExamples();
    inferrer.reset();
  }

  useEffect(() => {
    inferrer.reset();
    setExamples([]);
  }, [selectedDataViewId, inferrer]);

  useEffect(() => {
    loadExamples();
  }, [selectedField, selectedDataView, loadExamples]);

  async function run() {
    setErrorText(null);
    try {
      await inferrer.infer();
    } catch (e) {
      setErrorText(extractErrorMessage(e));
    }
  }

  useEffect(() => {
    inferrer.inputText$.next(examples);
  }, [examples, inferrer]);

  return (
    <>
      <>{infoComponent}</>
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
      <EuiFormRow label="Field">
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

      <EuiAccordion id={'simpleAccordionId'} buttonContent="View pipeline">
        <EuiCodeBlock language="json" fontSize="s" paddingSize="s" lineNumbers>
          {JSON.stringify(inferrer.getPipeline(), null, 2)}
        </EuiCodeBlock>
      </EuiAccordion>

      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={run}
            disabled={runningState === RUNNING_STATE.RUNNING || selectedField === undefined}
            fullWidth={false}
          >
            <FormattedMessage
              id="xpack.ml.trainedModels.testModelsFlyout.inferenceInputForm.runButton"
              defaultMessage="Test"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {runningState === RUNNING_STATE.RUNNING ? <EuiLoadingSpinner size="xl" /> : null}
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={clearResults}
            disabled={runningState === RUNNING_STATE.RUNNING || selectedField === undefined}
          >
            <FormattedMessage
              id="xpack.ml.trainedModels.testModelsFlyout.inferenceInputForm.runButton"
              defaultMessage="Refresh"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      {runningState !== RUNNING_STATE.FINISHED
        ? examples.map((example) => (
            <>
              {/* <div>{example}</div> */}
              <EuiText size="s">{example}</EuiText>
              {/* <div style={{ lineHeight: '24px' }}>{example}</div> */}
              <EuiHorizontalRule />
            </>
          ))
        : null}

      {errorText !== null || runningState === RUNNING_STATE.FINISHED_WITH_ERRORS ? (
        <ErrorMessage errorText={errorText} />
      ) : null}

      {runningState === RUNNING_STATE.FINISHED ? <>{outputComponent}</> : null}
    </>
  );
};
