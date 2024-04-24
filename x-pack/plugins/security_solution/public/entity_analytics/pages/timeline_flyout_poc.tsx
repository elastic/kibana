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
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
  EuiTitle,
  formatDate,
} from '@elastic/eui';
import React from 'react';
import { get, groupBy } from 'lodash';

import { css } from '@emotion/css';
import { TIMELINE_POC_DATA } from './timeline_data';

export const EntityTimelinePOC = ({ onClose }: { onClose: () => void }) => {
  const data = TIMELINE_POC_DATA.map((item) => item._source);
  const groupedByHost = groupBy(data, 'entity.host.name');
  const myHostData = groupedByHost['My-test-host'].sort((a, b) =>
    a['@timestamp'] > b['@timestamp'] ? -1 : 1
  );

  return (
    <EuiFlyout ownFocus onClose={onClose} size="m">
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <EuiText>{'Entity Timeline'}</EuiText>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTimeline aria-label="Life cycle of data">
          {myHostData.map((item) => (
            <ItemRenderer key={item['@timestamp']} item={item} />
          ))}
        </EuiTimeline>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

const ItemRenderer = ({ item }) => {
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

const getItemTitle = (item) => {
  if (item.fields_changed?.includes('host.risk.calculated_level')) {
    return 'Asset criticality updated';
  }
  return item.created ? 'Entity created' : 'Document updated';
};

const getIcon = (item) => {
  if (item.fields_changed?.includes('host.risk.calculated_level')) {
    return 'gear';
  }
  return item.created ? (
    <EuiAvatar size="m" name="Small size" iconType="plusInCircle" />
  ) : (
    'documentEdit'
  );
};

const getContent = (item) => {
  if (item.fields_changed?.includes('host.risk.calculated_level')) {
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
          <del>{get(item.previous_values, 'host.risk.calculated_level')}</del>
          {'->'}
          <ins>{get(item.entity, 'host.risk.calculated_level')}</ins>
        </>
      </div>
    );
  }

  if (item.created) {
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
      {fields.map(([fieldName, before, after], index) => (
        <EuiFlexItem>
          <span>
            {fieldName} {': '} <del>{JSON.stringify(before)}</del> {'->'}
            <ins>{JSON.stringify(after)}</ins>
            {index < fields.length - 1 ? <br /> : ''}
          </span>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
