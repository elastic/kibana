/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import { isString, isEmpty } from 'lodash/fp';
import React, { useCallback } from 'react';
import styled from 'styled-components';

import { DefaultDraggable } from '../../../../../common/components/draggables';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { getRuleDetailsUrl } from '../../../../../common/components/link_to/redirect_to_detection_engine';
import { TruncatableText } from '../../../../../common/components/truncatable_text';

import { isUrlInvalid } from '../../../../../common/utils/validators';
import endPointSvg from '../../../../../common/utils/logo_endpoint/64_color.svg';

import * as i18n from './translations';
import { SecurityPageName } from '../../../../../app/types';
import { useFormatUrl } from '../../../../../common/components/link_to';
import { useKibana } from '../../../../../common/lib/kibana';
import { APP_ID } from '../../../../../../common/constants';
import { LinkAnchor } from '../../../../../common/components/links';

const EventModuleFlexItem = styled(EuiFlexItem)`
  width: 100%;
`;

const Separator = styled.div`
  height: 2px;
  margin: 12px 0;
  width: 90%;
  background: linear-gradient(90deg, rgba(238, 238, 238, 1) 70%, rgba(238, 238, 238, 0) 100%);
`;

interface RenderRuleNameProps {
  contextId: string;
  eventId: string;
  fieldName: string;
  linkValue: string | null | undefined;
  truncate?: boolean;
  value: string | number | null | undefined;
}

interface NotDraggableProps {
  truncate?: boolean;
  isDraggingDisabled: boolean;
  fieldName: string;
  value: string | number | null | undefined;
  isRoleSeparator?: boolean;
}

export const NotDraggable: React.FC<NotDraggableProps> = ({
  truncate,
  isDraggingDisabled,
  fieldName,
  value,
  isRoleSeparator,
}) => {
  return (truncate || isDraggingDisabled) && !isEmpty(value) && !isRoleSeparator ? (
    <>
      <TruncatableText data-test-subj="truncatable-message">
        <EuiToolTip
          data-test-subj="message-tool-tip"
          content={
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem grow={false}>
                <span>{fieldName}</span>
              </EuiFlexItem>
              {!isDraggingDisabled && (
                <EuiFlexItem grow={false}>
                  <span>{value}</span>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          }
        >
          <div>{value}</div>
        </EuiToolTip>
      </TruncatableText>
    </>
  ) : isRoleSeparator ? (
    <Separator role={'separator'} />
  ) : (
    <div>{value}</div>
  );
};

export const RenderRuleName: React.FC<RenderRuleNameProps> = ({
  contextId,
  eventId,
  fieldName,
  linkValue,
  truncate,
  value,
}) => {
  const ruleName = `${value}`;
  const ruleId = linkValue;
  const { search } = useFormatUrl(SecurityPageName.detections);
  const { navigateToApp, getUrlForApp } = useKibana().services.application;
  const content = truncate ? <TruncatableText>{value}</TruncatableText> : value;

  const goToRuleDetails = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(`${APP_ID}:${SecurityPageName.detections}`, {
        path: getRuleDetailsUrl(ruleId ?? '', search),
      });
    },
    [navigateToApp, ruleId, search]
  );

  return isString(value) && ruleName.length > 0 && ruleId != null ? (
    <DefaultDraggable
      field={fieldName}
      id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}-${ruleId}`}
      tooltipContent={value}
      value={value}
    >
      <LinkAnchor
        onClick={goToRuleDetails}
        href={getUrlForApp(`${APP_ID}:${SecurityPageName.detections}`, {
          path: getRuleDetailsUrl(ruleId, search),
        })}
      >
        {content}
      </LinkAnchor>
    </DefaultDraggable>
  ) : value != null ? (
    <DefaultDraggable
      field={fieldName}
      id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}-${ruleId}`}
      tooltipContent={value}
      value={`${value}`}
    >
      {value}
    </DefaultDraggable>
  ) : (
    getEmptyTagValue()
  );
};

const canYouAddEndpointLogo = (moduleName: string, endpointUrl: string | null | undefined) =>
  moduleName.trim().toLocaleLowerCase() === 'endgame' &&
  endpointUrl != null &&
  !isEmpty(endpointUrl) &&
  !isUrlInvalid(endpointUrl) &&
  endpointUrl.includes('/alerts/');

export const renderEventModule = ({
  contextId,
  eventId,
  fieldName,
  linkValue,
  truncate,
  value,
}: {
  contextId: string;
  eventId: string;
  fieldName: string;
  linkValue: string | null | undefined;
  truncate?: boolean;
  value: string | number | null | undefined;
}) => {
  const moduleName = `${value}`;
  const endpointRefUrl = linkValue;

  const content = truncate ? <TruncatableText>{value}</TruncatableText> : value;

  return isString(value) && moduleName.length > 0 ? (
    <EuiFlexGroup
      gutterSize="none"
      alignItems="center"
      justifyContent={
        endpointRefUrl != null && !isEmpty(endpointRefUrl) ? 'flexStart' : 'spaceBetween'
      }
    >
      <EventModuleFlexItem>
        <DefaultDraggable
          field={fieldName}
          id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}-${moduleName}`}
          tooltipContent={value}
          value={value}
        >
          {content}
        </DefaultDraggable>
      </EventModuleFlexItem>
      {endpointRefUrl != null && canYouAddEndpointLogo(moduleName, endpointRefUrl) && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            data-test-subj="event-module-link-to-elastic-endpoint-security"
            content={
              <>
                <p>{i18n.LINK_ELASTIC_ENDPOINT_SECURITY}</p>
                <p>{endpointRefUrl}</p>
              </>
            }
          >
            <EuiLink href={endpointRefUrl} target="_blank">
              <EuiIcon type={endPointSvg} size="m" />
            </EuiLink>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  ) : (
    getEmptyTagValue()
  );
};

export const renderUrl = ({
  contextId,
  eventId,
  fieldName,
  linkValue,
  truncate,
  value,
}: {
  contextId: string;
  eventId: string;
  fieldName: string;
  linkValue: string | null | undefined;
  truncate?: boolean;
  value: string | number | null | undefined;
}) => {
  const urlName = `${value}`;

  const content = truncate ? <TruncatableText>{value}</TruncatableText> : value;

  return isString(value) && urlName.length > 0 ? (
    <DefaultDraggable
      field={fieldName}
      id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}-${urlName}`}
      tooltipContent={value}
      value={value}
    >
      {!isUrlInvalid(urlName) && (
        <EuiLink target="_blank" href={urlName}>
          {content}
        </EuiLink>
      )}
      {isUrlInvalid(urlName) && <>{content}</>}
    </DefaultDraggable>
  ) : (
    getEmptyTagValue()
  );
};
