/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { Ecs } from '../../../../../../graphql/types';
import {
  DragEffects,
  DraggableWrapper,
} from '../../../../../../common/components/drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../../../../common/components/drag_and_drop/helpers';
import { GoogleLink, ReputationLink } from '../../../../../../common/components/links';
import { Provider } from '../../../data_providers/provider';
import { IS_OPERATOR } from '../../../data_providers/data_provider';

import * as i18n from './translations';

const Badge = (styled(EuiBadge)`
  vertical-align: top;
` as unknown) as typeof EuiBadge;

Badge.displayName = 'Badge';

const TokensFlexItem = styled(EuiFlexItem)`
  margin-left: 3px;
`;

TokensFlexItem.displayName = 'TokensFlexItem';

const LinkFlexItem = styled(EuiFlexItem)`
  margin-left: 6px;
`;

LinkFlexItem.displayName = 'LinkFlexItem';

type StringRenderer = (value: string) => string;

export const defaultStringRenderer: StringRenderer = (value: string) => value;

export const moduleStringRenderer: StringRenderer = (value: string) => {
  const split = value.split('.');
  if (split.length >= 2 && split[1] != null) {
    if (split[1] !== '') {
      return split[1];
    } else {
      return split[0];
    }
  } else {
    return value;
  }
};

export const droppedStringRenderer: StringRenderer = (value: string) => `Dropped:${value}`;

export const md5StringRenderer: StringRenderer = (value: string) => `md5: ${value.substr(0, 7)}...`;

export const sha1StringRenderer: StringRenderer = (value: string) =>
  `sha1: ${value.substr(0, 7)}...`;

export const DraggableZeekElement = React.memo<{
  id: string;
  field: string;
  value: string | null | undefined;
  stringRenderer?: StringRenderer;
}>(({ id, field, value, stringRenderer = defaultStringRenderer }) =>
  value != null ? (
    <TokensFlexItem grow={false}>
      <DraggableWrapper
        dataProvider={{
          and: [],
          enabled: true,
          id: escapeDataProviderId(
            `draggable-zeek-element-draggable-wrapper-${id}-${field}-${value}`
          ),
          name: value,
          excluded: false,
          kqlQuery: '',
          queryMatch: {
            field,
            value,
            operator: IS_OPERATOR,
          },
        }}
        render={(dataProvider, _, snapshot) =>
          snapshot.isDragging ? (
            <DragEffects>
              <Provider dataProvider={dataProvider} />
            </DragEffects>
          ) : (
            <EuiToolTip data-test-subj="badge-tooltip" content={field}>
              <Badge iconType="tag" color="hollow" title="">
                {stringRenderer(value)}
              </Badge>
            </EuiToolTip>
          )
        }
      />
    </TokensFlexItem>
  ) : null
);

DraggableZeekElement.displayName = 'DraggableZeekElement';

interface LinkProps {
  value: string | null | undefined;
  link?: string | null;
}

export const Link = React.memo<LinkProps>(({ value, link }) => {
  if (value != null) {
    if (link != null) {
      return (
        <LinkFlexItem grow={false}>
          <div>
            <GoogleLink link={link}>{value}</GoogleLink>
          </div>
        </LinkFlexItem>
      );
    } else {
      return (
        <LinkFlexItem grow={false}>
          <div>
            <GoogleLink link={value} />
          </div>
        </LinkFlexItem>
      );
    }
  } else {
    return null;
  }
});

Link.displayName = 'Link';

interface TotalVirusLinkShaProps {
  value: string | null | undefined;
}

export const TotalVirusLinkSha = React.memo<TotalVirusLinkShaProps>(({ value }) =>
  value != null ? (
    <LinkFlexItem grow={false}>
      <div>
        <ReputationLink
          domain={value}
          overflowIndexStart={1}
          showDomain={true}
          data-test-subj="reputationLinkSha"
        />
      </div>
    </LinkFlexItem>
  ) : null
);

TotalVirusLinkSha.displayName = 'TotalVirusLinkSha';

// English Text for these codes are shortened from
// https://docs.zeek.org/en/stable/scripts/base/protocols/conn/main.bro.html
export const zeekConnLogDictionay: Readonly<Record<string, string>> = {
  S0: i18n.S0,
  S1: i18n.S1,
  S2: i18n.S2,
  S3: i18n.S3,
  SF: i18n.SF,
  REJ: i18n.REJ,
  RSTO: i18n.RSTO,
  RSTR: i18n.RSTR,
  RSTOS0: i18n.RSTOS0,
  RSTRH: i18n.RSTRH,
  SH: i18n.SH,
  SHR: i18n.SHR,
  OTH: i18n.OTH,
};

export const extractStateLink = (state: string | null | undefined) => {
  if (state != null) {
    const lookup = zeekConnLogDictionay[state];
    if (lookup != null) {
      return `${state} ${lookup}`;
    } else {
      return state;
    }
  } else {
    return null;
  }
};

export const extractStateValue = (state: string | null | undefined): string | null =>
  state != null && zeekConnLogDictionay[state] != null ? zeekConnLogDictionay[state] : null;

export const constructDroppedValue = (dropped: boolean | null | undefined): string | null =>
  dropped != null ? String(dropped) : null;

interface ZeekSignatureProps {
  data: Ecs;
  timelineId: string;
}

export const ZeekSignature = React.memo<ZeekSignatureProps>(({ data, timelineId }) => {
  const id = `zeek-signature-draggable-zeek-element-${timelineId}-${data._id}`;
  const sessionId: string | null | undefined = get('zeek.session_id[0]', data);
  const dataSet: string | null | undefined = get('event.dataset[0]', data);
  const sslVersion: string | null | undefined = get('zeek.ssl.version[0]', data);
  const cipher: string | null | undefined = get('zeek.ssl.cipher[0]', data);
  const state: string | null | undefined = get('zeek.connection.state[0]', data);
  const history: string | null | undefined = get('zeek.connection.history[0]', data);
  const note: string | null | undefined = get('zeek.notice.note[0]', data);
  const noteMsg: string | null | undefined = get('zeek.notice.msg[0]', data);
  const dropped: string | null | undefined = constructDroppedValue(
    get('zeek.notice.dropped[0]', data)
  );
  const dnsQuery: string | null | undefined = get('zeek.dns.query[0]', data);
  const qClassName: string | null | undefined = get('zeek.dns.qclass_name[0]', data);
  const httpMethod: string | null | undefined = get('http.request.method[0]', data);
  const httpResponseStatusCode: string | null | undefined = get(
    'http.response.status_code[0]',
    data
  );
  const urlOriginal: string | null | undefined = get('url.original[0]', data);
  const fileSha1: string | null | undefined = get('zeek.files.sha1[0]', data);
  const filemd5: string | null | undefined = get('zeek.files.md5[0]', data);
  const stateLink: string | null | undefined = extractStateLink(state);
  const stateValue: string | null | undefined = extractStateValue(state);
  return (
    <>
      <EuiFlexGroup justifyContent="center" gutterSize="none" wrap={true}>
        <DraggableZeekElement id={id} field="zeek.session_id" value={sessionId} />
        <DraggableZeekElement
          id={id}
          field="event.dataset"
          value={dataSet}
          stringRenderer={moduleStringRenderer}
        />
        <DraggableZeekElement
          id={id}
          field="zeek.files.sha1"
          value={fileSha1}
          stringRenderer={sha1StringRenderer}
        />
        <DraggableZeekElement
          id={id}
          field="zeek.files.md5"
          value={filemd5}
          stringRenderer={md5StringRenderer}
        />
        <DraggableZeekElement
          id={id}
          field="zeek.notice.dropped"
          value={dropped}
          stringRenderer={droppedStringRenderer}
        />
        <DraggableZeekElement id={id} field="zeek.ssl.version" value={sslVersion} />
        <DraggableZeekElement id={id} field="zeek.ssl.cipher" value={cipher} />
        <DraggableZeekElement id={id} field="zeek.connection.state" value={state} />
        <DraggableZeekElement id={id} field="http.request.method" value={httpMethod} />
        <DraggableZeekElement id={id} field="zeek.connection.history" value={history} />
        <DraggableZeekElement id={id} field="zeek.notice.note" value={note} />
        <DraggableZeekElement id={id} field="zeek.dns.query" value={dnsQuery} />
        <DraggableZeekElement id={id} field="zeek.dns.qclass_name" value={qClassName} />
        <DraggableZeekElement
          id={id}
          field="http.response.status_code"
          value={httpResponseStatusCode}
        />
      </EuiFlexGroup>
      <EuiFlexGroup justifyContent="center" gutterSize="none">
        <Link link={stateLink} value={stateValue} />
        <Link value={cipher} />
        <Link value={dnsQuery} />
        <Link value={noteMsg} />
        <Link value={urlOriginal} />
        <TotalVirusLinkSha value={fileSha1} />
      </EuiFlexGroup>
    </>
  );
});

ZeekSignature.displayName = 'ZeekSignature';
