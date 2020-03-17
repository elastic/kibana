/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';
import React, { useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { formatRequestPayload, formatJson } from '../lib/format';
import { painlessContextOptions, exampleScript } from '../common/constants';
import { PayloadFormat } from '../common/types';
import { useSubmitCode } from '../hooks';
import { OutputPane } from './output_pane';
import { MainControls } from './main_controls';
import { Editor } from './editor';
import { RequestFlyout } from './request_flyout';

interface Props {
  http: HttpSetup;
}

const PAINLESS_LAB_KEY = 'painlessLabState';

export function Main({ http }: Props) {
  const [state, setState] = useState(() => ({
    code: exampleScript,
    context: painlessContextOptions[0].value,
    parameters: '',
    index: '',
    document: '',
    query: '',
    ...JSON.parse(localStorage.getItem(PAINLESS_LAB_KEY) || '{}'),
  }));

  const [isRequestFlyoutOpen, setRequestFlyoutOpen] = useState(false);
  const { inProgress, response, submit } = useSubmitCode(http);

  // Live-update the output and persist state as the user changes it.
  const { code, context, parameters, index, document, query } = state;
  useEffect(() => {
    submit(state);
    localStorage.setItem(PAINLESS_LAB_KEY, JSON.stringify(state));
  }, [state, submit]);

  const onCodeChange = (newCode: string) => {
    setState({ ...state, code: newCode });
  };

  const onContextChange = (newContext: string) => {
    setState({ ...state, context: newContext });
  };

  const onParametersChange = (newParameters: string) => {
    setState({ ...state, parameters: newParameters });
  };

  const onIndexChange = (newIndex: string) => {
    setState({ ...state, index: newIndex });
  };

  const onDocumentChange = (newDocument: string) => {
    setState({ ...state, document: newDocument });
  };

  const onQueryChange = (newQuery: string) => {
    setState({ ...state, query: newQuery });
  };

  const toggleRequestFlyout = () => {
    setRequestFlyoutOpen(!isRequestFlyoutOpen);
  };

  return (
    <div className="painlessLabMainContainer">
      <EuiFlexGroup className="painlessLabPanelsContainer" responsive={false} gutterSize="none">
        <EuiFlexItem>
          <EuiTitle className="euiScreenReaderOnly">
            <h1>
              {i18n.translate('xpack.painlessLab.title', {
                defaultMessage: 'Painless Lab',
              })}
            </h1>
          </EuiTitle>

          <Editor code={code} onChange={onCodeChange} />
        </EuiFlexItem>

        <EuiFlexItem>
          <OutputPane
            isLoading={inProgress}
            response={response}
            context={context}
            parameters={parameters}
            index={index}
            document={document}
            query={query}
            onContextChange={onContextChange}
            onParametersChange={onParametersChange}
            onIndexChange={onIndexChange}
            onDocumentChange={onDocumentChange}
            onQueryChange={onQueryChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <MainControls
        isLoading={inProgress}
        toggleRequestFlyout={toggleRequestFlyout}
        isRequestFlyoutOpen={isRequestFlyoutOpen}
        reset={() => onCodeChange(exampleScript)}
      />

      {isRequestFlyoutOpen && (
        <RequestFlyout
          onClose={() => setRequestFlyoutOpen(false)}
          requestBody={formatRequestPayload(state, PayloadFormat.PRETTY)}
          response={response ? formatJson(response.result || response.error) : ''}
        />
      )}
    </div>
  );
}
