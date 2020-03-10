/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';
import React, { useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { buildRequestPayload, formatJson, getFromLocalStorage } from '../lib/helpers';
import { ContextChangeHandler } from '../common/types';
import { OutputPane } from './output_pane';
import { MainControls } from './main_controls';
import { Editor } from './editor';
import { RequestFlyout } from './request_flyout';
import { useSubmitCode } from '../hooks';
import { exampleScript } from '../common/constants';

interface Props {
  http: HttpSetup;
}

export function Main({ http }: Props) {
  const [code, setCode] = useState(getFromLocalStorage('painlessLabCode', exampleScript));
  const [isRequestFlyoutOpen, setRequestFlyoutOpen] = useState(false);

  const [context, setContext] = useState(
    getFromLocalStorage('painlessLabContext', 'painless_test_without_params')
  );

  const [contextSetup, setContextSetup] = useState(
    getFromLocalStorage('painlessLabContextSetup', {}, true)
  );

  const { inProgress, response, submit } = useSubmitCode(http);

  // Live-update the output as the user changes the input code.
  useEffect(() => {
    submit(code, context, contextSetup);
  }, [submit, code, context, contextSetup]);

  const toggleRequestFlyout = () => {
    setRequestFlyoutOpen(!isRequestFlyoutOpen);
  };

  const contextChangeHandler: ContextChangeHandler = ({
    context: nextContext,
    contextSetup: nextContextSetup,
  }) => {
    if (nextContext) {
      setContext(nextContext);
    }
    if (nextContextSetup) {
      setContextSetup(nextContextSetup);
    }
  };

  return (
    <>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiTitle className="euiScreenReaderOnly">
            <h1>
              {i18n.translate('xpack.painlessLab.title', {
                defaultMessage: 'Painless Lab',
              })}
            </h1>
          </EuiTitle>

          <Editor code={code} setCode={setCode} />
        </EuiFlexItem>

        <EuiFlexItem>
          <OutputPane
            response={response}
            context={context}
            contextSetup={contextSetup}
            isLoading={inProgress}
            onContextChange={contextChangeHandler}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <MainControls
        isLoading={inProgress}
        toggleRequestFlyout={toggleRequestFlyout}
        isRequestFlyoutOpen={isRequestFlyoutOpen}
        reset={() => setCode(exampleScript)}
      />

      {isRequestFlyoutOpen && (
        <RequestFlyout
          onClose={() => setRequestFlyoutOpen(false)}
          requestBody={formatJson(buildRequestPayload(code, context, contextSetup))}
          response={response ? formatJson(response.result || response.error) : ''}
        />
      )}
    </>
  );
}
