/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  sendGetAgents,
  sendGetOneAgentPolicy,
  sendPutSettings,
  useLink,
  useStartServices,
} from '../../../hooks';
import type { PackagePolicy } from '../../../types';
import { FLEET_SERVER_PACKAGE } from '../../../constants';

interface Props {
  onClose: () => void;
}

export const FleetServerUpgradeModal: React.FunctionComponent<Props> = ({ onClose }) => {
  const { getAssetsPath } = useLink();
  const { notifications, cloud, docLinks } = useStartServices();

  const isCloud = !!cloud?.cloudId;

  const [checked, setChecked] = useState(false);
  const [isAgentsAndPoliciesLoaded, setAgentsAndPoliciesLoaded] = useState(false);

  // Check if an other agent than the fleet server is already enrolled
  useEffect(() => {
    async function check() {
      try {
        const agentPoliciesAlreadyChecked: { [k: string]: boolean } = {};

        const res = await sendGetAgents({
          page: 1,
          perPage: 10,
          showInactive: false,
        });

        if (res.error) {
          throw res.error;
        }

        for (const agent of res.data?.items ?? []) {
          if (!agent.policy_id || agentPoliciesAlreadyChecked[agent.policy_id]) {
            continue;
          }

          agentPoliciesAlreadyChecked[agent.policy_id] = true;
          const policyRes = await sendGetOneAgentPolicy(agent.policy_id);
          const hasFleetServer =
            (policyRes.data?.item.package_policies as PackagePolicy[]).some((p: PackagePolicy) => {
              return p.package?.name === FLEET_SERVER_PACKAGE;
            }) ?? false;
          if (!hasFleetServer) {
            await sendPutSettings({
              has_seen_fleet_migration_notice: true,
            });
            onClose();
            return;
          }
        }
        setAgentsAndPoliciesLoaded(true);
      } catch (err) {
        notifications.toasts.addError(err, {
          title: i18n.translate('xpack.fleet.fleetServerUpgradeModal.errorLoadingAgents', {
            defaultMessage: `Error loading agents`,
          }),
        });
      }
    }

    check();
  }, [notifications.toasts, onClose]);

  const onChange = useCallback(async () => {
    try {
      setChecked(!checked);
      await sendPutSettings({
        has_seen_fleet_migration_notice: !checked,
      });
    } catch (error) {
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.fleet.fleetServerUpgradeModal.failedUpdateTitle', {
          defaultMessage: `Error saving settings`,
        }),
      });
    }
  }, [checked, setChecked, notifications]);

  if (!isAgentsAndPoliciesLoaded) {
    return null;
  }

  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.fleet.fleetServerUpgradeModal.modalTitle"
            defaultMessage="Enroll your agents into Fleet Server"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiImage
          size="fullWidth"
          src={getAssetsPath('./announcement.jpg')}
          alt={i18n.translate('xpack.fleet.fleetServerUpgradeModal.announcementImageAlt', {
            defaultMessage: 'Fleet Server upgrade announcement',
          })}
        />
        <EuiSpacer size="m" />
        <EuiText>
          {isCloud ? (
            <FormattedMessage
              id="xpack.fleet.fleetServerUpgradeModal.cloudDescriptionMessage"
              defaultMessage="Fleet Server is now available and it provides improved scalability and security. If you already had an APM instance on Elastic Cloud, we've upgraded it to APM & Fleet. If not, you can add one to your deployment for free. {existingAgentsMessage} To continue using Fleet, you must use Fleet Server and install the new version of Elastic Agent on each host."
              values={{
                existingAgentsMessage: (
                  <strong>
                    <FormattedMessage
                      id="xpack.fleet.fleetServerUpgradeModal.existingAgentText"
                      defaultMessage="Your existing Elastic Agents have been automatically unenrolled and have stopped sending data."
                    />
                  </strong>
                ),
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.fleetServerUpgradeModal.onPremDescriptionMessage"
              defaultMessage="Fleet Server is now available and it provides improved scalability and security. {existingAgentsMessage} To continue using Fleet, you must install a Fleet Server and the new version of Elastic Agent on each host. Learn more in our {link}."
              values={{
                existingAgentsMessage: (
                  <strong>
                    <FormattedMessage
                      id="xpack.fleet.fleetServerUpgradeModal.existingAgentText"
                      defaultMessage="Your existing Elastic Agents have been automatically unenrolled and have stopped sending data."
                    />
                  </strong>
                ),
                link: (
                  <EuiLink
                    href={docLinks.links.fleet.upgradeElasticAgent712lower}
                    external={true}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.fleet.fleetServerUpgradeModal.fleetServerMigrationGuide"
                      defaultMessage="Fleet Server migration guide"
                    />
                  </EuiLink>
                ),
              }}
            />
          )}
        </EuiText>
        <EuiSpacer size="l" />
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.fleetServerUpgradeModal.breakingChangeMessage"
            defaultMessage="This is a breaking change, which is why we are making it in a beta release. We are sorry for the inconvenience. Please share {link} if you have questions or need help."
            values={{
              link: (
                <EuiLink href="https://ela.st/fleet-feedback" target="_blank">
                  <FormattedMessage
                    id="xpack.fleet.fleetServerUpgradeModal.fleetFeedbackLink"
                    defaultMessage="feedback"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id="fleetServerModalCheckbox"
              label={i18n.translate('xpack.fleet.fleetServerUpgradeModal.checkboxLabel', {
                defaultMessage: 'Do not show this message again',
              })}
              checked={checked}
              onChange={onChange}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={onClose}>
              <FormattedMessage
                id="xpack.fleet.fleetServerUpgradeModal.closeButton"
                defaultMessage="Close and get started"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
