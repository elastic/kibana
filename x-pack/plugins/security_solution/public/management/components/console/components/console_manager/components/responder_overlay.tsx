/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useCallback, MouseEventHandler } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiPanel } from '@elastic/eui';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { AdministrationListPage } from '../../../../administration_list_page';
import { PageOverlay } from './page_overlay';

const RESPONDER_PAGE_TITLE = i18n.translate('xpack.securitySolution.responder_overlay.pageTitle', {
  defaultMessage: 'Responder',
});
const RESPONDER_PAGE_BACK_LABEL = i18n.translate(
  'xpack.securitySolution.responder_overlay.backButtonLabel',
  {
    defaultMessage: 'Back',
  }
);

export interface ResponderOverlayProps {
  runningConsoles: ReactNode;
  isHidden: boolean;
  onHide: () => void;
}

export const ResponderOverlay = memo<ResponderOverlayProps>(
  ({ runningConsoles, onHide, isHidden }) => {
    const getTestId = useTestIdGenerator('responder');
    const handleBackToPageOnCLick: MouseEventHandler = useCallback(
      (ev) => {
        ev.preventDefault();
        onHide();
      },
      [onHide]
    );

    return (
      <PageOverlay
        isHidden={isHidden}
        data-test-subj={getTestId('pageOverlay')}
        hideOnUrlPathnameChange
        onHide={onHide}
        enableScrolling
        paddingSize="xl"
      >
        <EuiPanel borderRadius="none" hasShadow={false} paddingSize="l" color="transparent">
          <AdministrationListPage
            title={RESPONDER_PAGE_TITLE}
            hasBottomBorder={false}
            hideHeader={isHidden}
            headerBackComponent={
              <EuiButtonEmpty
                flush="left"
                size="xs"
                iconType="arrowLeft"
                onClick={handleBackToPageOnCLick}
              >
                {RESPONDER_PAGE_BACK_LABEL}
              </EuiButtonEmpty>
            }
          >
            {runningConsoles}
          </AdministrationListPage>
        </EuiPanel>
      </PageOverlay>
    );
  }
);
ResponderOverlay.displayName = 'ResponderOverlay';
