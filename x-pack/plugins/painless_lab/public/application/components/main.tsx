/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';
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

interface Props {
  http: HttpSetup;
}

export const Main: FunctionComponent<Props> = ({ http }) => {
  const { state, setState } = useAppContext();

  const [isRequestFlyoutOpen, setRequestFlyoutOpen] = useState(false);
  const { inProgress, response, submit } = useSubmitCode(http);

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
            onChange={nextCode => setState(s => ({ ...s, code: nextCode }))}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <OutputPane isLoading={inProgress} response={response} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <MainControls
        isLoading={inProgress}
        toggleRequestFlyout={toggleRequestFlyout}
        isRequestFlyoutOpen={isRequestFlyoutOpen}
        reset={() => setState(s => ({ ...s, code: exampleScript }))}
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
