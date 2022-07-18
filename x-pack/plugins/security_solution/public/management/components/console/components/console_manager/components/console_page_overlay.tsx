/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode, MouseEventHandler } from 'react';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PageLayoutProps } from './page_layout';
import { PageLayout } from './page_layout';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { PageOverlay } from '../../../../page_overlay/page_overlay';
import { ConsoleExitModal } from './console_exit_modal';

const BACK_LABEL = i18n.translate('xpack.securitySolution.consolePageOverlay.backButtonLabel', {
  defaultMessage: 'Back',
});

export interface ConsolePageOverlayProps {
  console: ReactNode;
  hasPendingActions: boolean;
  isHidden: boolean;
  onHide: () => void;
  pageTitle?: ReactNode;
  pendingExitMessage?: ReactNode;
  body?: ReactNode;
  actions?: ReactNode[];
}

export const ConsolePageOverlay = memo<ConsolePageOverlayProps>(
  ({
    console,
    hasPendingActions,
    onHide,
    pendingExitMessage,
    isHidden,
    body,
    actions,
    pageTitle = '',
  }) => {
    const getTestId = useTestIdGenerator('consolePageOverlay');
    const [showExitModal, setShowExitModal] = useState(false);

    const handleCloseOverlayOnClick: MouseEventHandler = useCallback(
      (ev) => {
        ev.preventDefault();
        setShowExitModal(hasPendingActions);
        if (!hasPendingActions) {
          onHide();
        }
      },
      [onHide, hasPendingActions]
    );

    const onCancelModal = useCallback(() => setShowExitModal(false), [setShowExitModal]);

    const layoutProps = useMemo<PageLayoutProps>(() => {
      // If in `hidden` mode, then we don't render the html for the layout header section
      // of the layout
      if (isHidden) return {};

      return {
        pageTitle,
        pageBody: body,
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
    }, [actions, getTestId, handleCloseOverlayOnClick, isHidden, pageTitle, body]);

    return (
      <PageOverlay
        isHidden={isHidden}
        data-test-subj="consolePageOverlay"
        onHide={onHide}
        paddingSize="l"
        enableScrolling={false}
      >
        <PageLayout {...layoutProps}>
          {showExitModal && (
            <ConsoleExitModal
              message={pendingExitMessage}
              onClose={onHide}
              onCancel={onCancelModal}
              data-test-subj={getTestId('console-exit-modal')}
            />
          )}
          {console}
        </PageLayout>
      </PageOverlay>
    );
  }
);
ConsolePageOverlay.displayName = 'ConsolePageOverlay';
