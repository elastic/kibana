/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';
import { isString, isEmpty } from 'lodash/fp';
import React, { SyntheticEvent, useCallback, useMemo } from 'react';
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
import { APP_UI_ID } from '../../../../../../common/constants';
import { LinkAnchor } from '../../../../../common/components/links';

const EventModuleFlexItem = styled(EuiFlexItem)`
  width: 100%;
`;

interface RenderRuleNameProps {
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  contextId: string;
  eventId: string;
  fieldName: string;
  isDraggable: boolean;
  linkValue: string | null | undefined;
  truncate?: boolean;
  title?: string;
  value: string | number | null | undefined;
}

export const RenderRuleName: React.FC<RenderRuleNameProps> = ({
  Component,
  contextId,
  eventId,
  fieldName,
  isDraggable,
  linkValue,
  truncate,
  title,
  value,
}) => {
  const ruleName = `${value}`;
  const ruleId = linkValue;
  const { search } = useFormatUrl(SecurityPageName.rules);
  const { navigateToApp, getUrlForApp } = useKibana().services.application;
  const content = truncate ? (
    <TruncatableText dataTestSubj={`formatted-field-${fieldName}`}>{value}</TruncatableText>
  ) : (
    value
  );

  const goToRuleDetails = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.rules,
        path: getRuleDetailsUrl(ruleId ?? '', search),
      });
    },
    [navigateToApp, ruleId, search]
  );

  const href = useMemo(
    () =>
      getUrlForApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.rules,
        path: getRuleDetailsUrl(ruleId ?? '', search),
      }),
    [getUrlForApp, ruleId, search]
  );
  const id = `event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}-${ruleId}`;

  if (isString(value) && ruleName.length > 0 && ruleId != null) {
    const link = Component ? (
      <Component
        aria-label={title}
        data-test-subj={`view-${fieldName}`}
        iconType="link"
        onClick={goToRuleDetails}
        title={title}
      >
        {title ?? value}
      </Component>
    ) : (
      <LinkAnchor onClick={goToRuleDetails} href={href} data-test-subj="ruleName">
        {content}
      </LinkAnchor>
    );

    return isDraggable ? (
      <DefaultDraggable
        field={fieldName}
        id={id}
        isDraggable={isDraggable}
        tooltipContent={value}
        value={value}
      >
        {link}
      </DefaultDraggable>
    ) : (
      link
    );
  } else if (value != null) {
    return isDraggable ? (
      <DefaultDraggable
        field={fieldName}
        id={id}
        isDraggable={isDraggable}
        tooltipContent={value}
        value={`${value}`}
      >
        {value}
      </DefaultDraggable>
    ) : (
      <>{value}</>
    );
  }

  return getEmptyTagValue();
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
  isDraggable,
  linkValue,
  truncate,
  value,
}: {
  contextId: string;
  eventId: string;
  fieldName: string;
  isDraggable: boolean;
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
        {isDraggable ? (
          <DefaultDraggable
            field={fieldName}
            id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}-${moduleName}`}
            isDraggable={isDraggable}
            tooltipContent={value}
            value={value}
          >
            {content}
          </DefaultDraggable>
        ) : (
          <>{content}</>
        )}
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

const GenericLinkComponent: React.FC<{
  children?: React.ReactNode;
  /** `Component` is only used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  dataTestSubj?: string;
  href: string;
  onClick?: (e: SyntheticEvent) => void;
  title?: string;
  iconType?: string;
}> = ({ children, Component, dataTestSubj, href, onClick, title, iconType = 'link' }) => {
  return Component ? (
    <Component
      data-test-subj={dataTestSubj}
      href={href}
      iconType={iconType}
      onClick={onClick}
      title={title}
    >
      {title ?? children}
    </Component>
  ) : (
    <EuiLink data-test-subj={dataTestSubj} target="_blank" href={href}>
      {title ?? children}
    </EuiLink>
  );
};

const GenericLink = React.memo(GenericLinkComponent);

export const renderUrl = ({
  contextId,
  Component,
  eventId,
  fieldName,
  isDraggable,
  truncate,
  title,
  value,
}: {
  contextId: string;
  /** `Component` is only used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  eventId: string;
  fieldName: string;
  isDraggable: boolean;
  truncate?: boolean;
  title?: string;
  value: string | number | null | undefined;
}) => {
  const urlName = `${value}`;
  const isUrlValid = !isUrlInvalid(urlName);

  const formattedValue = truncate ? <TruncatableText>{value}</TruncatableText> : value;
  const content = isUrlValid ? (
    <GenericLink
      Component={Component}
      href={urlName}
      dataTestSubj="ata-grid-url"
      title={title}
      iconType="link"
    />
  ) : (
    <>{formattedValue}</>
  );

  return isString(value) && urlName.length > 0 ? (
    isDraggable ? (
      <DefaultDraggable
        field={fieldName}
        id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}-${urlName}`}
        isDraggable={isDraggable}
        tooltipContent={value}
        value={value}
      >
        {content}
      </DefaultDraggable>
    ) : (
      content
    )
  ) : (
    getEmptyTagValue()
  );
};
