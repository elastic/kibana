/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import { isString, isEmpty } from 'lodash/fp';
import React from 'react';

import { DefaultDraggable } from '../../../draggables';
import { getEmptyTagValue } from '../../../empty_value';
import { getRuleDetailsUrl } from '../../../link_to/redirect_to_detection_engine';
import { TruncatableText } from '../../../truncatable_text';

import { isUrlInvalid } from '../../../../pages/detection_engine/rules/components/step_about_rule/helpers';
import endPointSvg from '../../../../utils/logo_endpoint/64_color.svg';

import * as i18n from './translations';

export const renderRuleName = ({
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
  const ruleName = `${value}`;
  const ruleId = linkValue;

  const content = truncate ? <TruncatableText>{value}</TruncatableText> : value;

  return isString(value) && ruleName.length > 0 && ruleId != null ? (
    <DefaultDraggable
      field={fieldName}
      id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}-${ruleId}`}
      tooltipContent={value}
      value={value}
    >
      <EuiLink href={getRuleDetailsUrl(ruleId)}>{content}</EuiLink>
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
      <EuiFlexItem>
        <DefaultDraggable
          field={fieldName}
          id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}-${moduleName}`}
          tooltipContent={value}
          value={value}
        >
          {content}
        </DefaultDraggable>
      </EuiFlexItem>
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

export const renderRulReference = ({
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
  const referenceUrlName = `${value}`;

  const content = truncate ? <TruncatableText>{value}</TruncatableText> : value;

  return isString(value) && referenceUrlName.length > 0 ? (
    <DefaultDraggable
      field={fieldName}
      id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}-${referenceUrlName}`}
      tooltipContent={value}
      value={value}
    >
      {!isUrlInvalid(referenceUrlName) && (
        <EuiLink target="_blank" href={referenceUrlName}>
          {content}
        </EuiLink>
      )}
      {isUrlInvalid(referenceUrlName) && <>{content}</>}
    </DefaultDraggable>
  ) : (
    getEmptyTagValue()
  );
};
