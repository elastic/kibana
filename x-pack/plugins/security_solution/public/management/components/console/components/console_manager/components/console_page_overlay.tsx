/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useCallback, MouseEventHandler, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { PageLayout, PageLayoutProps } from './page_layout';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { PageOverlay } from '../../../../page_overlay/page_overlay';

const BACK_LABEL = i18n.translate('xpack.securitySolution.consolePageOverlay.backButtonLabel', {
  defaultMessage: 'Return to page content',
});

export interface ConsolePageOverlayProps {
  runningConsoles: ReactNode;
  isHidden: boolean;
  onHide: () => void;
  pageTitle?: ReactNode;
  body?: ReactNode;
  actions?: ReactNode[];
}

export const ConsolePageOverlay = memo<ConsolePageOverlayProps>(
  ({ runningConsoles, onHide, isHidden, body, actions, pageTitle = '' }) => {
    const getTestId = useTestIdGenerator('responder');
    const handleCloseOverlayOnClick: MouseEventHandler = useCallback(
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
        pageTitle,
        headerHasBottomBorder: false,
        'data-test-subj': getTestId('layout'),
        headerBackComponent: (
          <EuiButtonEmpty
            flush="left"
            size="xs"
            iconType="arrowLeft"
            onClick={handleCloseOverlayOnClick}
          >
            {BACK_LABEL}
          </EuiButtonEmpty>
        ),
        actions: [
          <EuiButton
            fill
            onClick={handleCloseOverlayOnClick}
            minWidth="auto"
            data-test-subj={getTestId('doneButton')}
          >
            <FormattedMessage
              id="xpack.securitySolution.consolePageOverlay.doneButtonLabel"
              defaultMessage="Done"
            />
          </EuiButton>,

          ...(actions ?? []),
        ],
      };
    }, [actions, getTestId, handleCloseOverlayOnClick, isHidden, pageTitle]);

    return (
      <PageOverlay
        isHidden={isHidden}
        data-test-subj={getTestId('pageOverlay')}
        onHide={onHide}
        paddingSize="xl"
        enableScrolling={false}
      >
        <PageLayout {...layoutProps}>
          {body}

          {runningConsoles}
        </PageLayout>
      </PageOverlay>
    );
  }
);
ConsolePageOverlay.displayName = 'ConsolePageOverlay';
