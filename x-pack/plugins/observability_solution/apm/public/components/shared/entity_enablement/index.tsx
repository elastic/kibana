/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ERROR_USER_NOT_AUTHORIZED } from '@kbn/entityManager-plugin/public';
import useToggle from 'react-use/lib/useToggle';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverFooter,
  EuiSkeletonText,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TechnicalPreviewBadge } from '../technical_preview_badge';
import { ApmPluginStartDeps } from '../../../plugin';
import { useEntityManagerEnablementContext } from '../../../context/entity_manager_context/use_entity_manager_enablement_context';
import { FeedbackModal } from './feedback_modal';
import { Unauthorized } from './unauthorized_modal';

export function EntityEnablement() {
  const [isFeedbackModalVisible, setsIsFeedbackModalVisible] = useState(false);
  const [isUnauthorizedModalVisible, setsIsUnauthorizedModalVisible] = useState(false);

  const {
    services: { entityManager },
  } = useKibana<ApmPluginStartDeps>();

  const { isEntityManagerEnabled, isEnablementPending, refetch } =
    useEntityManagerEnablementContext();

  const [isPopoverOpen, togglePopover] = useToggle(false);
  const [isLoading, setIsLoading] = useToggle(false);

  const handleRestoreView = async () => {
    setIsLoading(true);
    try {
      const response = await entityManager.entityClient.disableManagedEntityDiscovery();
      if (response.success) {
        setIsLoading(false);
        setsIsFeedbackModalVisible(true);
      }
    } catch (error) {
      setIsLoading(false);
      setsIsFeedbackModalVisible(true);
      console.error(error);
    }
  };

  const handleEnablement = async () => {
    setIsLoading(true);
    try {
      const response = await entityManager.entityClient.enableManagedEntityDiscovery();
      if (response.success) {
        setIsLoading(false);
        refetch();
      }

      if (response.reason === ERROR_USER_NOT_AUTHORIZED) {
        setIsLoading(false);
        setsIsUnauthorizedModalVisible(true);
      }
    } catch (error) {
      setIsLoading(false);
      console.error(error);
    }
  };

  const handleOnCloseFeedback = () => {
    setsIsFeedbackModalVisible(false);
    refetch();
  };

  return isEnablementPending ? (
    <EuiFlexItem grow={false} css={{ maxWidth: '500px' }}>
      <EuiSkeletonText lines={1} data-test-sub="loading-content" />
    </EuiFlexItem>
  ) : (
    <EuiFlexGroup direction="row" alignItems="center" gutterSize="xs">
      <EuiFlexItem grow={false}>
        {isLoading ? <EuiLoadingSpinner size="m" /> : <TechnicalPreviewBadge icon="beaker" />}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink
          disabled={isEntityManagerEnabled}
          data-test-subj="tryOutEEMLink"
          onClick={handleEnablement}
        >
          {isEntityManagerEnabled
            ? i18n.translate('xpack.apm.eemEnablement.enabled.', {
                defaultMessage: 'Viewing our new experience',
              })
            : i18n.translate('xpack.apm.eemEnablement.tryItButton.', {
                defaultMessage: 'Try our new experience!',
              })}
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiButtonIcon
              onClick={togglePopover}
              data-test-subj="apmEntityEnablementWithFooterButton"
              iconType="iInCircle"
              size="xs"
              aria-label={i18n.translate('xpack.apm.entityEnablement.euiButtonIcon.arial', {
                defaultMessage: 'click to find more for the new ui experience',
              })}
            />
          }
          isOpen={isPopoverOpen}
          closePopover={togglePopover}
          anchorPosition="downLeft"
        >
          <div style={{ width: '300px' }}>
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.apm.entityEnablement.content', {
                  defaultMessage:
                    'Our new experience combines both APM-instrumented services with services detected from logs in a single service inventory.',
                })}
              </p>
            </EuiText>
          </div>
          <EuiPopoverFooter>
            <EuiTextColor color="subdued">
              <EuiLink
                data-test-subj="apmEntityEnablementLink"
                href="https://ela.st/new-experience-services"
                external
                target="_blank"
              >
                {i18n.translate('xpack.apm.entityEnablement.footer', {
                  defaultMessage: 'Learn more',
                })}
              </EuiLink>
            </EuiTextColor>
          </EuiPopoverFooter>
        </EuiPopover>
      </EuiFlexItem>
      {isEntityManagerEnabled && (
        <EuiFlexItem grow={false}>
          <EuiLink data-test-subj="restoreClassicView" onClick={handleRestoreView}>
            {i18n.translate('xpack.apm.eemEnablement.restoreClassicView.', {
              defaultMessage: 'Restore classic view',
            })}
          </EuiLink>
        </EuiFlexItem>
      )}
      <FeedbackModal
        isFeedbackModalVisible={isFeedbackModalVisible}
        onClose={handleOnCloseFeedback}
      />
      <Unauthorized
        isUnauthorizedModalVisible={isUnauthorizedModalVisible}
        onClose={() => setsIsUnauthorizedModalVisible(false)}
      />
    </EuiFlexGroup>
  );
}
