/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NavType } from 'src/core/public';
import { formatRequestPayload, formatJson } from '../lib/format';
import { exampleScript } from '../constants';
import { PayloadFormat } from '../types';
import { useSubmitCode } from '../hooks';
import { useAppContext } from '../context';
import { OutputPane } from './output_pane';
import { MainControls } from './main_controls';
import { Editor } from './editor';
import { RequestFlyout } from './request_flyout';

export const Main: React.FunctionComponent = () => {
  const {
    store: { payload, validation },
    updatePayload,
    services: {
      http,
      chrome: { getIsNavDrawerLocked$, getNavType$ },
    },
    links,
  } = useAppContext();

  const [isRequestFlyoutOpen, setRequestFlyoutOpen] = useState(false);
  const { inProgress, response, submit } = useSubmitCode(http);

  // Live-update the output and persist payload state as the user changes it.
  useEffect(() => {
    if (validation.isValid) {
      submit(payload);
    }
  }, [payload, submit, validation.isValid]);

  const toggleRequestFlyout = () => {
    setRequestFlyoutOpen(!isRequestFlyoutOpen);
  };

  const [isNavDrawerLocked, setIsNavDrawerLocked] = useState(false);
  const [isNavLegacy, setIsNavLegacy] = useState(false);

  useEffect(() => {
    const subscription = getIsNavDrawerLocked$().subscribe((newIsNavDrawerLocked: boolean) => {
      setIsNavDrawerLocked(newIsNavDrawerLocked);
    });

    return () => subscription.unsubscribe();
  });

  useEffect(() => {
    const subscription = getNavType$().subscribe((navType: NavType) => {
      setIsNavLegacy(navType === 'legacy');
    });

    return () => subscription.unsubscribe();
  });

  return (
    <div className="painlessLabMainContainer">
      <EuiFlexGroup className="painlessLabPanelsContainer" responsive={false} gutterSize="none">
        <EuiFlexItem className="painlessLabLeftPane">
          <EuiTitle className="euiScreenReaderOnly">
            <h1>
              {i18n.translate('xpack.painlessLab.title', {
                defaultMessage: 'Painless Lab',
              })}
            </h1>
          </EuiTitle>

          <Editor code={payload.code} onChange={(nextCode) => updatePayload({ code: nextCode })} />
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
        isNavDrawerLocked={isNavDrawerLocked}
        isNavLegacy={isNavLegacy}
        reset={() => updatePayload({ code: exampleScript })}
      />

      {isRequestFlyoutOpen && (
        <RequestFlyout
          links={links}
          onClose={() => setRequestFlyoutOpen(false)}
          requestBody={formatRequestPayload(payload, PayloadFormat.PRETTY)}
          response={response ? formatJson(response.result || response.error) : ''}
        />
      )}
    </div>
  );
};
