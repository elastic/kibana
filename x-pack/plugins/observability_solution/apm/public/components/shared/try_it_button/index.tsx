/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBetaBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

interface Props {
  isFeatureEnabled: boolean;
  promoLabel?: string;
  linkLabel: string;
  onClick: () => void;
  popoverContent?: React.ReactElement;
  icon?: 'beta' | 'beaker';
  isLoading: boolean;
}

export function TryItButton({
  isFeatureEnabled,
  linkLabel,
  onClick,
  popoverContent,
  promoLabel,
  icon,
  isLoading,
}: Props) {
  const { core } = useApmPluginContext();
  const canEditAdvancedSettings =
    core.application.capabilities.advancedSettings?.save;

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  function togglePopover() {
    setIsPopoverOpen((state) => !state);
  }

  function TryItBadge() {
    return (
      <EuiFlexItem grow={false}>
        <EuiBetaBadge
          color={'accent'}
          label={i18n.translate('xpack.apm.tryIt', {
            defaultMessage: 'Try it',
          })}
        />
      </EuiFlexItem>
    );
  }

  function Icon() {
    return (
      <>
        {icon && (
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              color="hollow"
              iconType={icon}
              label={
                icon === 'beaker'
                  ? i18n.translate('xpack.apm.tryIt.techPreview', {
                      defaultMessage: 'Technical preview',
                    })
                  : i18n.translate('xpack.apm.tryIt.beta', {
                      defaultMessage: 'Beta',
                    })
              }
            />
          </EuiFlexItem>
        )}
      </>
    );
  }

  function PromoLabel() {
    return (
      <>
        {!!promoLabel && (
          <EuiFlexItem grow={false}>
            <EuiText>{promoLabel}</EuiText>
          </EuiFlexItem>
        )}
      </>
    );
  }

  function Popover() {
    return (
      <>
        {popoverContent || !canEditAdvancedSettings ? (
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={
                <EuiButtonIcon
                  data-test-subj="apmPopoverButton"
                  iconType="questionInCircle"
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
              <>
                {popoverContent}
                {!canEditAdvancedSettings && (
                  <>
                    <EuiSpacer size="s" />
                    {i18n.translate(
                      'xpack.apm.tryItButton.euiButtonIcon.adminAccess',
                      {
                        defaultMessage:
                          'Please ask your administrator to turn it on by enabling it in within settings.',
                      }
                    )}
                  </>
                )}
              </>
            </EuiPopover>
          </EuiFlexItem>
        ) : null}
      </>
    );
  }

  function Link() {
    return (
      <>
        {linkLabel && canEditAdvancedSettings && (
          <EuiFlexItem grow={false}>
            <EuiLink
              data-test-subj="apmLink"
              disabled={isLoading}
              onClick={onClick}
            >
              {linkLabel}
            </EuiLink>
          </EuiFlexItem>
        )}
      </>
    );
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

  if (isFeatureEnabled) {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <Icon />
        <Link />
        <Popover />
        <Loading />
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <TryItBadge />
      <Icon />
      <PromoLabel />
      <Popover />
      <Link />
      <Loading />
    </EuiFlexGroup>
  );
}
