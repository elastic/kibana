/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, FunctionComponent } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { formatRequestPayload, formatJson } from '../lib/format';
import { exampleScript } from '../common/constants';
import { PayloadFormat } from '../common/types';
import { useSubmitCode } from '../hooks';
import { OutputPane } from './output_pane';
import { MainControls } from './main_controls';
import { Editor } from './editor';
import { RequestFlyout } from './request_flyout';
import { useAppContext } from '../context';

export const Main: FunctionComponent = () => {
  const { state, updateState, services, links } = useAppContext();

  const [isRequestFlyoutOpen, setRequestFlyoutOpen] = useState(false);
  const { inProgress, response, submit } = useSubmitCode(services.http);

  // Live-update the output and persist state as the user changes it.
  useEffect(() => {
    submit(state);
  }, [state, submit]);

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

          <Editor
            code={state.code}
            onChange={nextCode => updateState(() => ({ code: nextCode }))}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <OutputPane isLoading={inProgress} response={response} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <MainControls
        links={links}
        isLoading={inProgress}
        toggleRequestFlyout={toggleRequestFlyout}
        isRequestFlyoutOpen={isRequestFlyoutOpen}
        reset={() => updateState(() => ({ code: exampleScript }))}
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
};
