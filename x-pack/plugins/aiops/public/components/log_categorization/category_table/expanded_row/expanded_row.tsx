/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useCallback, useRef, useState } from 'react';
// import {
//   EuiDescriptionList,
//   EuiFlexGrid,
//   EuiFlexItem,
//   EuiPanel,
//   EuiSpacer,
//   EuiTab,
//   EuiTabs,
//   EuiTitle,
// } from '@elastic/eui';
import { css } from '@emotion/react';
import { DataViewField, DataView, RuntimeFieldSubFields } from '@kbn/data-views-plugin/common';
import { TimeRangeBounds } from '@kbn/data-plugin/common';
import { lastValueFrom } from 'rxjs';
import moment from 'moment';
import { FindFileStructureResponse, InputOverrides } from '@kbn/file-upload-plugin/common';
// import { cloneDeep } from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingElastic, EuiSpacer } from '@elastic/eui';
import { useAiopsAppContext } from '../../../../hooks/use_aiops_app_context';
import { Category } from '../../use_categorize_request';
import { AnalysisMarkup } from './analysis_markup';
import { getFieldsFromGrokPattern } from './analysis_markup/grok_pattern';
import { grokTypeToRuntimePrimitiveType } from './analysis_markup/get_field_names';

interface ExpandedRowProps {
  category: Category;
  selectedField: DataViewField;
  timefilterActiveBounds: TimeRangeBounds;
  dataView: DataView;
  openInDiscover(): void;
}

const DOC_COUNT = 1001;

export const ExpandedRow: FC<ExpandedRowProps> = ({
  category,
  selectedField,
  timefilterActiveBounds,
  dataView,
  openInDiscover,
}) => {
  const {
    fileUpload,
    data: { search },
    // dataViews,
  } = useAiopsAppContext();

  const abortCtrl = useRef(new AbortController());

  const [data, setData] = useState<string | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  // const [linesWithTimestamp, setLinesWithTimestamp] = useState<string[]>([]);

  const [results, setResults] = useState<FindFileStructureResponse | null>(null);

  const getData = useCallback(async (): Promise<string[]> => {
    const {
      rawResponse: {
        hits: { hits },
      },
    } = await lastValueFrom(
      search.search(
        {
          params: {
            index: dataView.getIndexPattern(),
            size: DOC_COUNT,
            fields: ['message'],
            query: {
              bool: {
                must: [],
                filter: [
                  {
                    range: {
                      '@timestamp': {
                        format: 'strict_date_optional_time',
                        gte: moment(timefilterActiveBounds.min?.valueOf()).toISOString(),
                        lte: moment(timefilterActiveBounds.max?.valueOf()).toISOString(),
                      },
                    },
                  },
                  {
                    bool: {
                      should: [
                        {
                          match: {
                            message: {
                              auto_generate_synonyms_phrase_query: false,
                              fuzziness: 0,
                              operator: 'and',
                              query: category.key,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
                should: [],
                must_not: [],
              },
            },
          },
        },
        { abortSignal: abortCtrl.current.signal }
      )
    );

    return hits.map((hit: any) => hit.fields.message[0]);
  }, [category.key, dataView, search, timefilterActiveBounds]);

  const runAnalysis = useCallback(
    async (tempLines: string[], overrides?: InputOverrides) => {
      const now = Date.now();
      const tempLinesWithTimestamp = tempLines.map(
        (line: string, i: number) => `${now + i} ${line}`
      );
      // setLinesWithTimestamp(tempLinesWithTimestamp);

      setData(tempLinesWithTimestamp.join('\n'));

      const defaultOverrides: Record<string, string> = {
        format: 'semi_structured_text',
        lines_to_sample: `${DOC_COUNT}`,
      };

      const tempOverrides = {
        ...(overrides?.grok_pattern
          ? {
              grok_pattern: overrides.grok_pattern,
              ...defaultOverrides,
            }
          : defaultOverrides),
      };

      const resp = await fileUpload.analyzeFile(tempLinesWithTimestamp.join('\n'), tempOverrides);
      // eslint-disable-next-line no-console
      console.log(resp);

      // const tempResults = removeTimestamp(resp.results);
      setResults({ ...resp.results });
    },
    [fileUpload]
  );

  // const analyzeFile = async (data2: string, overrides: InputOverrides) => {
  //   return { results: (await fileUpload.analyzeFile(data2, {})).results };
  // };

  const setGrokPattern = useCallback(
    async (grokPattern: string) => {
      runAnalysis(lines, { grok_pattern: grokPattern });
    },
    [lines, runAnalysis]
  );

  const createRuntimeField2 = useCallback(
    async (grokPattern: string) => {
      const dd = getFieldsFromGrokPattern(grokPattern);
      const escapedGrokPattern = grokPattern.replaceAll('\\', `\\\\`);

      for (const field of dd) {
        const script = `Map field = grok('${escapedGrokPattern}').extract(params._source.message);
      if (field !== null && field.get('${field.name}') != null){
        emit(field.get('${field.name}'));
      }
      `;
        const type = grokTypeToRuntimePrimitiveType(field.type);

        dataView.addRuntimeField(field.name, {
          type,
          script: { source: script },
        });
        if (dataView.isPersisted()) {
          // await dataViews.updateSavedObject(dataView);
        }

        // console.log(xx);
      }
    },
    [dataView]
  );

  const createCompositeRuntimeField = useCallback(
    async (grokPattern: string) => {
      const fieldName = `${selectedField.name}_grok`;
      const dd = getFieldsFromGrokPattern(grokPattern);
      const escapedGrokPattern = grokPattern.replaceAll('\\', `\\\\`);
      const script = `Map fields = grok('${escapedGrokPattern}').extract(params._source.message);
    if (fields != null){
      emit(fields);
    }
    `;
      const fields = dd.reduce<RuntimeFieldSubFields>((acc, { name, type }) => {
        acc[name] = { type: grokTypeToRuntimePrimitiveType(type) };
        return acc;
      }, {});

      dataView.addRuntimeField(fieldName, {
        type: 'composite',
        script: { source: script },
        fields,
      });
      if (dataView.isPersisted()) {
        // await dataViews.updateSavedObject(dataView);
      }
    },
    [dataView, selectedField.name]
  );

  const createRuntimeField = useCallback(
    async (grokPattern: string) => {
      if (false) {
        await createRuntimeField2(grokPattern);
      } else {
        await createCompositeRuntimeField(grokPattern);
      }
      openInDiscover();
    },
    [createCompositeRuntimeField, createRuntimeField2, openInDiscover]
  );

  useEffect(() => {
    setLoading(true);
    getData().then((tempLines) => {
      setLines(tempLines);
      runAnalysis(tempLines).then((resp) => {
        // eslint-disable-next-line no-console
        console.log(resp);
        setLoading(false);
      });
    });
  }, [fileUpload, getData, runAnalysis, selectedField, timefilterActiveBounds]);

  return (
    <div
      css={css`
        width: 100%;
        margin-right: 40px;
      `}
    >
      {loading && (
        <>
          <EuiSpacer />
          <EuiFlexGroup>
            <EuiFlexItem />
            <EuiFlexItem grow={false}>
              <EuiLoadingElastic size="xl" />
            </EuiFlexItem>
            <EuiFlexItem />
          </EuiFlexGroup>
          <EuiSpacer />
        </>
      )}

      {data !== null && results !== null && (
        <>
          <AnalysisMarkup
            data={data}
            results={results}
            setGrokPattern={setGrokPattern}
            createRuntimeField={createRuntimeField}
          />
          <EuiSpacer />
          {/* <FieldsTable
            results={results}
            overrides={{}}
            runAnalysis={(overrides: InputOverrides) => runAnalysis(lines, overrides)}
          /> */}
        </>
      )}
    </div>
  );
};

// function removeTimestamp(originalResults: FindFileStructureResponse) {
//   const results = cloneDeep(originalResults);
//   // if (results.grok_pattern !== undefined) {
//   //   results.grok_pattern = results.grok_pattern.replace(/%{POSINT:timestamp} /g, '');
//   // }
//   // if (results.mappings !== undefined) {
//   //   delete results.mappings.properties['@timestamp'];
//   // }

//   return results;
// }
