/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';

import { css } from '@emotion/react';

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  useGeneratedHtmlId,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { TryInConsoleButton } from '@kbn/try-in-console';

import { CREATE_CONNECTOR_PLUGIN } from '../../../../../../../common/constants';
import { KibanaDeps } from '../../../../../../../common/types';
import { SelfManagePreference } from '../create_connector';

import { ManualConfigurationFlyout } from './manual_configuration_flyout';

export interface ManualConfigurationProps {
  isDisabled: boolean;
  selfManagePreference: SelfManagePreference;
}

export const ManualConfiguration: React.FC<ManualConfigurationProps> = ({
  isDisabled,
  selfManagePreference,
}) => {
  const { euiTheme } = useEuiTheme();
  const { services } = useKibana<KibanaDeps>();
  const [isPopoverOpen, setPopover] = useState(false);
  const splitButtonPopoverId = useGeneratedHtmlId({
    prefix: 'splitButtonPopover',
  });
  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [flyoutContent, setFlyoutContent] = useState<'manual_config' | 'client'>();

  const items = [
    <EuiContextMenuItem
      key="copy"
      icon="wrench"
      onClick={() => {
        setFlyoutContent('manual_config');
        setIsFlyoutVisible(true);
        closePopover();
      }}
    >
      {i18n.translate(
        'xpack.enterpriseSearch.createConnector.finishUpStep.manageAttachedIndexContextMenuItemLabel',
        { defaultMessage: 'Manual configuration' }
      )}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="edit"
      icon="console"
      onClick={() => {
        closePopover();
      }}
      css={css`
        .euiLink {
          color: ${euiTheme.colors.text};
        }
      `}
    >
      <TryInConsoleButton
        application={services.application}
        sharePlugin={services.share}
        consolePlugin={services.console}
        content={i18n.translate(
          'xpack.enterpriseSearch.createConnector.flyoutManualConfigContent.TryInConsoleLabel',
          {
            defaultMessage: 'Try in Console',
          }
        )}
        type="link"
        request={CREATE_CONNECTOR_PLUGIN.CONSOLE_SNIPPET}
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="share"
      icon="console"
      onClick={() => {
        setFlyoutContent('client');
        setIsFlyoutVisible(true);
        closePopover();
      }}
    >
      {i18n.translate(
        'xpack.enterpriseSearch.createConnector.finishUpStep.scheduleASyncContextMenuItemLabel',
        {
          defaultMessage: 'Try with CLI',
        }
      )}
    </EuiContextMenuItem>,
  ];

  return (
    <>
      <EuiPopover
        id={splitButtonPopoverId}
        button={
          <EuiButtonIcon
            data-test-subj="enterpriseSearchFinishUpStepButton"
            display="fill"
            disabled={isDisabled}
            size="m"
            iconType="boxesVertical"
            aria-label={i18n.translate(
              'xpack.enterpriseSearch.createConnector.finishUpStep.euiButtonIcon.moreLabel',
              { defaultMessage: 'More' }
            )}
            onClick={onButtonClick}
          />
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel items={items} />
      </EuiPopover>
      {isFlyoutVisible && (
        <ManualConfigurationFlyout
          setIsFlyoutVisible={setIsFlyoutVisible}
          flyoutContent={flyoutContent}
          selfManagePreference={selfManagePreference}
        />
      )}
    </>
  );
};
