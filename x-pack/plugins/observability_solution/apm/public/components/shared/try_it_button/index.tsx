/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import useToggle from 'react-use/lib/useToggle';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useLocalStorage } from '../../../hooks/use_local_storage';
import { TechnicalPreviewBadge } from '../technical_preview_badge';

interface Props {
  isFeatureEnabled: boolean;
  promoLabel?: string;
  linkLabel: string;
  onClick: () => void;
  popoverContent?: React.ReactElement;
  isLoading: boolean;
}

export function TryItButton({
  isFeatureEnabled,
  linkLabel,
  onClick,
  popoverContent,
  promoLabel,
  isLoading,
}: Props) {
  const [showFastFilterTryCallout, setShowFastFilterTryCallout] = useLocalStorage(
    'apm.showFastFilterTryCallout',
    true
  );
  const { core } = useApmPluginContext();
  const canEditAdvancedSettings = core.application.capabilities.advancedSettings?.save;
  const [isPopoverOpen, togglePopover] = useToggle(false);

  if (!showFastFilterTryCallout) {
    return null;
  }

  function PromoLabel() {
    if (!promoLabel) {
      return null;
    }
    return (
      <EuiFlexItem grow={false}>
        <EuiText>{promoLabel}</EuiText>
      </EuiFlexItem>
    );
  }

  function Popover() {
    if (!popoverContent) {
      return null;
    }
    return (
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiButtonIcon
              data-test-subj="apmPopoverButton"
              iconType="iInCircle"
              aria-label={i18n.translate(
                'xpack.apm.tryItButton.euiButtonIcon.tryItHelperButtonLabel',
                { defaultMessage: 'Try it helper button' }
              )}
              onClick={togglePopover}
            />
          }
          isOpen={isPopoverOpen}
          closePopover={togglePopover}
          anchorPosition="upCenter"
        >
          <>{popoverContent}</>
        </EuiPopover>
      </EuiFlexItem>
    );
  }

  function Link() {
    if (!linkLabel) {
      return null;
    }

    const linkComponent = (
      <EuiFlexItem grow={false}>
        <EuiLink
          data-test-subj="apmLink"
          disabled={isLoading || !canEditAdvancedSettings}
          onClick={onClick}
        >
          {linkLabel}
        </EuiLink>
      </EuiFlexItem>
    );

    if (!canEditAdvancedSettings) {
      return (
        <EuiToolTip
          content={
            <EuiFlexGroup gutterSize="s" direction="column">
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="s" direction="row">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="lock" size="s" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs">
                      {i18n.translate('xpack.apm.tryItButton.euiButtonIcon.featureDisabled', {
                        defaultMessage: 'This feature is currently disabled.',
                      })}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs">
                  {i18n.translate('xpack.apm.tryItButton.euiButtonIcon.admin', {
                    defaultMessage:
                      'Please speak to you administrator to turn {featureEnabled} this feature.',
                    values: {
                      featureEnabled: isFeatureEnabled
                        ? i18n.translate('xpack.apm.tryItButton.euiButtonIcon.admin.off', {
                            defaultMessage: 'off',
                          })
                        : i18n.translate('xpack.apm.tryItButton.euiButtonIcon.admin.on', {
                            defaultMessage: 'on',
                          }),
                    },
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          {linkComponent}
        </EuiToolTip>
      );
    }

    return <>{linkComponent}</>;
  }

  function Loading() {
    return (
      <>
        {isLoading && (
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="s" />
          </EuiFlexItem>
        )}
      </>
    );
  }

  function HideThisButton() {
    return (
      <EuiFlexItem grow={false}>
        <EuiToolTip content="Hide this">
          <EuiButtonIcon
            data-test-subj="apmHideThisButtonButton"
            iconType="cross"
            onClick={() => {
              setShowFastFilterTryCallout(false);
            }}
          />
        </EuiToolTip>
      </EuiFlexItem>
    );
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <TechnicalPreviewBadge icon="beaker" />
      {isFeatureEnabled ? null : <PromoLabel />}
      <Link />
      <Popover />
      <Loading />
      <HideThisButton />
    </EuiFlexGroup>
  );
}
