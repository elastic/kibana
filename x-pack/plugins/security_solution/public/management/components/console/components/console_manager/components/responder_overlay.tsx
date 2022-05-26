/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useCallback, MouseEventHandler, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';
import { PageLayout, PageLayoutProps } from './page_layout';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { PageOverlay } from '../../../../page_overlay/page_overlay';

const RESPONDER_PAGE_TITLE = i18n.translate('xpack.securitySolution.responder_overlay.pageTitle', {
  defaultMessage: 'Responder',
});
const RESPONDER_PAGE_BACK_LABEL = i18n.translate(
  'xpack.securitySolution.responder_overlay.backButtonLabel',
  {
    defaultMessage: 'Return to page content',
  }
);

export interface ResponderOverlayProps {
  runningConsoles: ReactNode;
  isHidden: boolean;
  onHide: () => void;
  body?: ReactNode;
  actions?: ReactNode;
}

export const ResponderOverlay = memo<ResponderOverlayProps>(
  ({ runningConsoles, onHide, isHidden, body, actions }) => {
    const getTestId = useTestIdGenerator('responder');
    const handleBackToPageOnCLick: MouseEventHandler = useCallback(
      (ev) => {
        ev.preventDefault();
        onHide();
      },
      [onHide]
    );

    const layoutProps = useMemo<PageLayoutProps>(() => {
      // If in `hidden` mode, then we don't render the html for the layout header section
      // of the layout
      if (isHidden) return {};

      return {
        pageTitle: RESPONDER_PAGE_TITLE,
        headerHasBottomBorder: false,
        scrollableBody: true,
        headerBackComponent: (
          <EuiButtonEmpty
            flush="left"
            size="xs"
            iconType="arrowLeft"
            onClick={handleBackToPageOnCLick}
          >
            {RESPONDER_PAGE_BACK_LABEL}
          </EuiButtonEmpty>
        ),
        actions,
      };
    }, [actions, handleBackToPageOnCLick, isHidden]);

    return (
      <PageOverlay
        isHidden={isHidden}
        data-test-subj={getTestId('pageOverlay')}
        hideOnUrlPathnameChange
        onHide={onHide}
        paddingSize="xl"
      >
        <PageLayout {...layoutProps}>
          {body}

          {runningConsoles}
        </PageLayout>
      </PageOverlay>
    );
  }
);
ResponderOverlay.displayName = 'ResponderOverlay';
