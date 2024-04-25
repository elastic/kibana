/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiAvatar,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
  formatDate,
} from '@elastic/eui';
import React from 'react';
import { get } from 'lodash';

import { css } from '@emotion/css';
import type { EntityHistoryDocument } from '../../../common/entity_analytics/entity_store/types';

export const EntityTimelineHistory = ({
  isLoading,
  data,
}: {
  isLoading: boolean;
  data?: EntityHistoryDocument[];
}) => {
  if (isLoading) {
    return <EuiText>{'Loading...'}</EuiText>;
  }

  if (!data || data.length === 0) {
    return <EuiText>{'No data'}</EuiText>;
  }

  return (
    <>
      <EuiSpacer />
      <EuiTimeline aria-label="Life cycle of data">
        {data.map((item) => (
          <ItemRenderer key={item['@timestamp']} item={item} />
        ))}
      </EuiTimeline>
    </>
  );
};

const ItemRenderer = ({ item }: { item: EntityHistoryDocument }) => {
  return (
    <EuiTimelineItem icon={getIcon(item)}>
      <EuiText color={'subdued'} size="xs">
        {formatDate(item['@timestamp'])}
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiSplitPanel.Outer color="transparent" hasBorder grow>
        <EuiSplitPanel.Inner color="subdued">
          <b>{getItemTitle(item)}</b>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>{getContent(item)}</EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </EuiTimelineItem>
  );
};

const getItemTitle = (item: EntityHistoryDocument) => {
  if ('fields_changed' in item && item.fields_changed?.includes('host.asset.criticality')) {
    return 'Asset criticality updated';
  }
  return 'created' in item ? 'Entity created' : 'Document updated';
};

const getIcon = (item: EntityHistoryDocument) => {
  if ('fields_changed' in item && item.fields_changed?.includes('host.asset.criticality')) {
    return 'gear';
  }
  return 'created' in item ? (
    <EuiAvatar size="m" name="Small size" iconType="plusInCircle" />
  ) : (
    'documentEdit'
  );
};

const getContent = (item: EntityHistoryDocument) => {
  if ('fields_changed' in item && item.fields_changed?.includes('host.asset.criticality')) {
    return (
      <div
        css={css`
          ins {
            color: #007871;
          }
          del {
            color: #bd271e;
          }
        `}
      >
        <>
          <del>{get(item.previous_values, 'host.asset.criticality', 'none')}</del>
          {'->'}
          <ins>{get(item.entity, 'host.asset.criticality')}</ins>
        </>
      </div>
    );
  }

  if ('created' in item) {
    return (
      <EuiAccordion id="observed" buttonContent={'show document'}>
        <EuiCodeBlock language="json" fontSize="m" paddingSize="m" isCopyable>
          {JSON.stringify(item.entity, null, 2)}
        </EuiCodeBlock>
      </EuiAccordion>
    );
  }
  const fields = item.fields_changed?.map((fieldName: string) => [
    fieldName,
    get(item.previous_values, fieldName),
    get(item.entity, fieldName),
  ]);

  return (
    <EuiFlexGroup
      gutterSize="s"
      direction="column"
      css={css`
        ins {
          color: #007871;
        }
        del {
          color: #bd271e;
        }
      `}
    >
      {fields.map(([fieldName, before, after], index) => {
        if (!before && !after) return <></>;

        if (!before) {
          return (
            <EuiFlexItem>
              <span>
                {fieldName} {': '} <ins>{after ? JSON.stringify(after) : 'none'}</ins>
                {index < fields.length - 1 ? <br /> : ''}
              </span>
            </EuiFlexItem>
          );
        }

        return (
          <EuiFlexItem>
            <span>
              {fieldName} {': '} <del>{before ? JSON.stringify(before) : 'none'}</del> {'->'}
              <ins>{after ? JSON.stringify(after) : 'none'}</ins>
              {index < fields.length - 1 ? <br /> : ''}
            </span>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
