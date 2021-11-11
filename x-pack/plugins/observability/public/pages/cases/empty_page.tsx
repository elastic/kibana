/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  IconType,
  EuiCard,
} from '@elastic/eui';
import React, { MouseEventHandler, ReactNode, useMemo } from 'react';
import styled from 'styled-components';

const EmptyPrompt = styled(EuiEmptyPrompt)`
  align-self: center; /* Corrects horizontal centering in IE11 */
  max-width: 60em;
`;

EmptyPrompt.displayName = 'EmptyPrompt';

interface EmptyPageActions {
  icon?: IconType;
  label: string;
  target?: string;
  url: string;
  descriptionTitle?: string;
  description?: string;
  fill?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
}

export type EmptyPageActionsProps = Record<string, EmptyPageActions>;

interface EmptyPageProps {
  actions: EmptyPageActionsProps;
  'data-test-subj'?: string;
  message?: ReactNode;
  title: string;
}

const EmptyPageComponent = React.memo<EmptyPageProps>(({ actions, message, title, ...rest }) => {
  const titles = Object.keys(actions);
  const maxItemWidth = 283;
  const renderActions = useMemo(
    () =>
      Object.values(actions)
        .filter((a) => a.label && a.url)
        .map(
          (
            { icon, label, target, url, descriptionTitle, description, onClick, fill = true },
            idx
          ) =>
            descriptionTitle != null || description != null ? (
              <EuiFlexItem
                grow={false}
                style={{ maxWidth: maxItemWidth }}
                key={`emptyPageAction-${titles[idx]}`}
              >
                <EuiCard
                  title={descriptionTitle ?? false}
                  description={description ?? false}
                  footer={
                    /* eslint-disable-next-line @elastic/eui/href-or-on-click */
                    <EuiButton
                      href={url}
                      onClick={onClick}
                      iconType={icon}
                      target={target}
                      fill={fill}
                      data-test-subj={`emptyPageAction-${titles[idx]}`}
                    >
                      {label}
                    </EuiButton>
                  }
                />
              </EuiFlexItem>
            ) : (
              <EuiFlexItem
                grow={false}
                style={{ maxWidth: maxItemWidth }}
                key={`emptyPageAction-${titles[idx]}`}
              >
                {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
                <EuiButton
                  href={url}
                  onClick={onClick}
                  iconType={icon}
                  target={target}
                  data-test-subj={`emptyPageAction-${titles[idx]}`}
                >
                  {label}
                </EuiButton>
              </EuiFlexItem>
            )
        ),
    [actions, titles]
  );

  return (
    <EmptyPrompt
      iconType="logoObservability"
      title={<h2>{title}</h2>}
      body={message && <p>{message}</p>}
      actions={<EuiFlexGroup justifyContent="center">{renderActions}</EuiFlexGroup>}
      {...rest}
    />
  );
});

EmptyPageComponent.displayName = 'EmptyPageComponent';

export const EmptyPage = React.memo(EmptyPageComponent);
EmptyPage.displayName = 'EmptyPage';
