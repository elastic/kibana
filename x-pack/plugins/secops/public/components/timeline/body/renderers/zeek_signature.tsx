/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { get } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { Ecs } from '../../../../graphql/types';
import { escapeQueryValue } from '../../../../lib/keury';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { GoogleLink, VirusTotalLink } from '../../../links';
import { Provider } from '../../../timeline/data_providers/provider';

import * as i18n from './translations';

const Badge = styled(EuiBadge)`
  vertical-align: top;
`;

const TokensFlexItem = styled(EuiFlexItem)`
  margin-left: 3px;
`;

const LinkFlexItem = styled(EuiFlexItem)`
  margin-left: 6px;
`;

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

export const DraggableZeekElement = pure<{
  id: string;
  field: string;
  value: string | null;
  stringRenderer?: StringRenderer;
}>(({ id, field, value, stringRenderer = defaultStringRenderer }) =>
  value != null ? (
    <TokensFlexItem grow={false}>
      <DraggableWrapper
        dataProvider={{
          and: [],
          enabled: true,
          id: escapeDataProviderId(`zeek-${id}-${field}-${value}`),
          name: value,
          excluded: false,
          kqlQuery: '',
          queryMatch: {
            field,
            value: escapeQueryValue(value),
          },
        }}
        render={(dataProvider, _, snapshot) =>
          snapshot.isDragging ? (
            <DragEffects>
              <Provider dataProvider={dataProvider} />
            </DragEffects>
          ) : (
            <Badge iconType="tag" color="hollow">
              {stringRenderer(value)}
            </Badge>
          )
        }
      />
    </TokensFlexItem>
  ) : null
);

export const Link = pure<{ value: string | null; link?: string | null }>(({ value, link }) => {
  if (value != null) {
    if (link != null) {
      return (
        <LinkFlexItem grow={false}>
          <GoogleLink link={link}>{value}</GoogleLink>
        </LinkFlexItem>
      );
    } else {
      return (
        <LinkFlexItem grow={false}>
          <GoogleLink link={value} />
        </LinkFlexItem>
      );
    }
  } else {
    return null;
  }
});

export const TotalVirusLinkSha = pure<{ value: string | null }>(({ value }) =>
  value != null ? (
    <LinkFlexItem grow={false}>
      <VirusTotalLink link={value}>{value}</VirusTotalLink>
    </LinkFlexItem>
  ) : null
);

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

export const extractStateLink = (state: string | null) => {
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

export const extractStateValue = (state: string | null): string | null =>
  state != null && zeekConnLogDictionay[state] != null ? zeekConnLogDictionay[state] : null;

export const constructDroppedValue = (dropped: boolean | null): string | null =>
  dropped != null ? String(dropped) : null;

export const ZeekSignature = pure<{ data: Ecs }>(({ data }) => {
  const id = data._id;
  const sessionId: string | null = get('zeek.session_id', data);

  const dataSet: string | null = get('event.dataset', data);

  const sslVersion: string | null = get('zeek.ssl.version', data);
  const cipher: string | null = get('zeek.ssl.cipher', data);

  const state: string | null = get('zeek.connection.state', data);
  const history: string | null = get('zeek.connection.history', data);

  const note: string | null = get('zeek.notice.note', data);
  const noteMsg: string | null = get('zeek.notice.msg', data);
  const dropped: string | null = constructDroppedValue(get('zeek.notice.dropped', data));

  const dnsQuery: string | null = get('zeek.dns.query', data);
  const qClassName: string | null = get('zeek.dns.qclass_name', data);

  const httpMethod: string | null = get('http.request.method', data);
  const httpResponseStatusCode: string | null = get('http.response.status_code', data);

  const urlOriginal: string | null = get('url.original', data);

  const fileSha1: string | null = get('zeek.files.sha1', data);
  const filemd5: string | null = get('zeek.files.md5', data);

  const stateLink: string | null = extractStateLink(state);
  const stateValue: string | null = extractStateValue(state);
  return (
    <>
      <EuiFlexGroup justifyContent="center" gutterSize="none">
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
