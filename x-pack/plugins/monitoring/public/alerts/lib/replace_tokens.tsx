/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import moment from 'moment';
import { EuiLink } from '@elastic/eui';
import {
  AlertMessage,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  AlertMessageDocLinkToken,
} from '../../../server/alerts/types';
// @ts-ignore
import { formatTimestampToDuration } from '../../../common';
import { CALCULATE_DURATION_UNTIL } from '../../../common/constants';
import { AlertMessageTokenType } from '../../../common/enums';
import { Legacy } from '../../legacy_shims';

export function replaceTokens(alertMessage: AlertMessage): JSX.Element | string | null {
  if (!alertMessage) {
    return null;
  }

  let text = alertMessage.text;
  if (!alertMessage.tokens || !alertMessage.tokens.length) {
    return text;
  }

  const timeTokens = alertMessage.tokens.filter(
    (token) => token.type === AlertMessageTokenType.Time
  );
  const linkTokens = alertMessage.tokens.filter(
    (token) => token.type === AlertMessageTokenType.Link
  );
  const docLinkTokens = alertMessage.tokens.filter(
    (token) => token.type === AlertMessageTokenType.DocLink
  );

  for (const token of timeTokens) {
    const timeToken = token as AlertMessageTimeToken;
    text = text.replace(
      timeToken.startToken,
      timeToken.isRelative
        ? formatTimestampToDuration(timeToken.timestamp, CALCULATE_DURATION_UNTIL)
        : moment.tz(timeToken.timestamp, moment.tz.guess()).format('LLL z')
    );
  }

  let element: JSX.Element = <Fragment>{text}</Fragment>;
  for (const token of linkTokens) {
    const linkToken = token as AlertMessageLinkToken;
    const linkPart = new RegExp(`${linkToken.startToken}(.+?)${linkToken.endToken}`).exec(text);
    if (!linkPart || linkPart.length < 2) {
      continue;
    }
    const index = text.indexOf(linkPart[0]);
    const preString = text.substring(0, index);
    const postString = text.substring(index + linkPart[0].length);
    element = (
      <Fragment>
        {preString}
        <EuiLink href={`#${linkToken.url}`}>{linkPart[1]}</EuiLink>
        {postString}
      </Fragment>
    );
  }

  for (const token of docLinkTokens) {
    const linkToken = token as AlertMessageDocLinkToken;
    const linkPart = new RegExp(`${linkToken.startToken}(.+?)${linkToken.endToken}`).exec(text);
    if (!linkPart || linkPart.length < 2) {
      continue;
    }

    const url = linkToken.partialUrl
      .replace('{elasticWebsiteUrl}', Legacy.shims.docLinks.ELASTIC_WEBSITE_URL)
      .replace('{docLinkVersion}', Legacy.shims.docLinks.DOC_LINK_VERSION);
    const index = text.indexOf(linkPart[0]);
    const preString = text.substring(0, index);
    const postString = text.substring(index + linkPart[0].length);
    element = (
      <Fragment>
        {preString}
        <EuiLink href={url}>{linkPart[1]}</EuiLink>
        {postString}
      </Fragment>
    );
  }

  return element;
}
