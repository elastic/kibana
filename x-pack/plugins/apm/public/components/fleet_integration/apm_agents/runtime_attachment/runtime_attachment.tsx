/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiDragDropContext,
  EuiDroppable,
  EuiDraggable,
  EuiIcon,
  DropResult,
  EuiFormRow,
  EuiFieldText,
  EuiLink,
} from '@elastic/eui';
import React, { ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DiscoveryRule } from './discovery_rule';
import { DefaultDiscoveryRule } from './default_discovery_rule';
import { EditDiscoveryRule } from './edit_discovery_rule';
import { IDiscoveryRuleList, Operation, RuntimeAttachmentSettings } from '.';

interface Props {
  isEnabled: boolean;
  onToggleEnable: () => void;
  discoveryRuleList: IDiscoveryRuleList;
  setDiscoveryRuleList: (discoveryRuleItems: IDiscoveryRuleList) => void;
  onDelete: (discoveryItemId: string) => void;
  editDiscoveryRuleId: null | string;
  onEdit: (discoveryItemId: string) => void;
  onChangeOperation: (operationText: string) => void;
  stagedOperationText: string;
  onChangeType: (typeText: string) => void;
  stagedTypeText: string;
  onChangeProbe: (probeText: string) => void;
  stagedProbeText: string;
  onCancel: () => void;
  onSubmit: () => void;
  onAddRule: () => void;
  operationTypes: Operation[];
  toggleDescription: ReactNode;
  discoveryRulesDescription: ReactNode;
  showUnsavedWarning?: boolean;
  onDragEnd: (dropResult: DropResult) => void;
  version: RuntimeAttachmentSettings['version'];
  onChangeVersion: (nextVersion: RuntimeAttachmentSettings['version']) => void;
  isValidVersion: boolean;
}

export function RuntimeAttachment({
  isEnabled,
  onToggleEnable,
  discoveryRuleList,
  setDiscoveryRuleList,
  onDelete,
  editDiscoveryRuleId,
  onEdit,
  onChangeOperation,
  stagedOperationText,
  onChangeType,
  stagedTypeText,
  onChangeProbe,
  stagedProbeText,
  onCancel,
  onSubmit,
  onAddRule,
  operationTypes,
  toggleDescription,
  discoveryRulesDescription,
  showUnsavedWarning,
  onDragEnd,
  version,
  onChangeVersion,
  isValidVersion,
}: Props) {
  const {
    services: { docLinks },
  } = useKibana();
  return (
    <div>
      {showUnsavedWarning && (
        <>
          <EuiCallOut
            title={i18n.translate(
              'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.unsavedRules',
              {
                defaultMessage:
                  'You have unsaved changes. Click "Save integration" to sync changes to the integration.',
              }
            )}
            color="warning"
            iconType="iInCircle"
            size="s"
          />
          <EuiSpacer />
        </>
      )}
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiSwitch
            label={i18n.translate(
              'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.enableRuntimeAttachement',
              { defaultMessage: 'Enable runtime attachment' }
            )}
            checked={isEnabled}
            onChange={onToggleEnable}
          />
          <EuiSpacer size="s" />
          <EuiText color="subdued" size="s">
            <p>{toggleDescription}</p>
          </EuiText>
        </EuiFlexItem>
        {isEnabled && (
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate(
                'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.version',
                { defaultMessage: 'Version' }
              )}
              isInvalid={!isValidVersion}
              error={i18n.translate(
                'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.version.invalid',
                { defaultMessage: 'Invalid version' }
              )}
              helpText={
                <FormattedMessage
                  id="xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.version.helpText"
                  defaultMessage="Enter the {versionLink} of the Elastic APM Java agent that should be attached."
                  values={{
                    versionLink: (
                      <EuiLink
                        href={`${docLinks?.ELASTIC_WEBSITE_URL}/guide/en/apm/agent/java/current/release-notes.html`}
                        target="_blank"
                      >
                        {i18n.translate(
                          'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.version.helpText.version',
                          { defaultMessage: 'version' }
                        )}
                      </EuiLink>
                    ),
                  }}
                />
              }
            >
              <EuiFieldText
                value={version || ''}
                onChange={(e) => {
                  const nextVersion = e.target.value;
                  onChangeVersion(isEmpty(nextVersion) ? null : nextVersion);
                }}
                placeholder={i18n.translate(
                  'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.version.placeHolder',
                  { defaultMessage: 'Add a version' }
                )}
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {isEnabled && (
        <>
          <EuiSpacer size="l" />
          <EuiText size="s">
            <h3>
              {i18n.translate(
                'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.discoveryRules',
                { defaultMessage: 'Discovery rules' }
              )}
            </h3>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiIcon type="iInCircle" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs">
                <p>{discoveryRulesDescription}</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="plusInCircle"
                disabled={editDiscoveryRuleId !== null}
                onClick={onAddRule}
              >
                {i18n.translate(
                  'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.addRule',
                  { defaultMessage: 'Add rule' }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiDragDropContext onDragEnd={onDragEnd}>
            <EuiDroppable droppableId="RUNTIME_ATTACHMENT_DROPPABLE">
              {discoveryRuleList.map(({ discoveryRule, id }, idx) => (
                <EuiDraggable
                  spacing="m"
                  key={id}
                  index={idx}
                  draggableId={id}
                  customDragHandle={true}
                >
                  {(provided) =>
                    id === editDiscoveryRuleId ? (
                      <EditDiscoveryRule
                        id={editDiscoveryRuleId}
                        onChangeOperation={onChangeOperation}
                        operation={stagedOperationText}
                        onChangeType={onChangeType}
                        type={stagedTypeText}
                        onChangeProbe={onChangeProbe}
                        probe={stagedProbeText}
                        onCancel={onCancel}
                        onSubmit={onSubmit}
                        operationTypes={operationTypes}
                      />
                    ) : (
                      <DiscoveryRule
                        id={id}
                        order={idx + 1}
                        operation={discoveryRule.operation}
                        type={discoveryRule.type}
                        probe={discoveryRule.probe}
                        providedDragHandleProps={provided.dragHandleProps}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        operationTypes={operationTypes}
                      />
                    )
                  }
                </EuiDraggable>
              ))}
            </EuiDroppable>
          </EuiDragDropContext>
          <DefaultDiscoveryRule />
        </>
      )}
      <EuiSpacer size="s" />
    </div>
  );
}
