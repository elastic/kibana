/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, { Fragment, useState, useEffect } from 'react';
import {
  EuiCodeBlock,
  EuiSpacer,
  EuiFormRow,
  EuiText,
  EuiProgress,
  EuiFlexItem,
  EuiCallOut,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';

export function JsonImportProgress({
  importStage = '',
  indexDataResp,
  indexPatternResp,
  complete = false,
  indexName
}) {

  // Retain last index for UI purposes
  const [index, setIndex] = useState('');
  useEffect(() => { indexName && setIndex(indexName); }, [setIndex, indexName]);

  // Format json responses
  const [indexDataJson, setIndexDataJson] = useState('');
  useEffect(() => {
    indexDataResp && !indexDataJson &&
      setIndexDataJson(JSON.stringify(indexDataResp, null, 2));
  }, [indexDataResp, indexPatternResp, indexDataJson]);

  const [indexPatternJson, setIndexPatternJson] = useState('');
  useEffect(() => {
    indexPatternResp && !indexPatternJson &&
      setIndexPatternJson(JSON.stringify(indexPatternResp, null, 2));
  }, [indexDataResp, indexPatternResp, indexPatternJson]);

  const importMessage = complete ? importStage : `${importStage}: ${index}`;

  return (
    <Fragment>
      { !complete ? <EuiProgress size="xs" color="accent" position="absolute" /> : null }
      <EuiSpacer size="m" />
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.file_upload.indexNameLabel"
            defaultMessage="Indexing status"
          />
        }
      >
        <EuiText>
          {importMessage}
        </EuiText>
      </EuiFormRow>
      <EuiSpacer size="m" />
      { complete
        ? (
          <Fragment>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.file_upload.indexNameLabel"
                  defaultMessage="Indexing response"
                />
              }
            >
              {
                indexDataJson
                  ? (
                    <EuiCodeBlock
                      paddingSize="s"
                      overflowHeight={200}
                    >
                      {indexDataJson}
                    </EuiCodeBlock>
                  )
                  : null
              }
            </EuiFormRow>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.file_upload.indexNameLabel"
                  defaultMessage="Index pattern response"
                />
              }
            >
              {
                indexPatternJson
                  ? (
                    <EuiCodeBlock
                      paddingSize="s"
                      overflowHeight={200}
                    >
                      {indexPatternJson}
                    </EuiCodeBlock>
                  )
                  : null
              }
            </EuiFormRow>
            <EuiFormRow>
              <EuiFlexItem>
                <EuiCallOut
                  title="Index modifications"
                  iconType="pin"
                >
                  <div>
                    {'Further index modifications can be made using\n'}
                    <a
                      target="_blank"
                      href={`${chrome.getBasePath()}/app/kibana#/
                      management/elasticsearch/index_management/indices/
                      filter/${index}`.replace(/\s/g, '')}
                    >
                      Index Management
                    </a>
                  </div>
                </EuiCallOut>
              </EuiFlexItem>
            </EuiFormRow>
          </Fragment>
        )
        : null
      }
      <EuiSpacer size="s" />
    </Fragment>
  );
}
