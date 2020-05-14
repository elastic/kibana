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
} from '../../../server/alerts/types';
// @ts-ignore
import { formatTimestampToDuration } from '../../../common';
import { CALCULATE_DURATION_UNTIL } from '../../../common/constants';

export function replaceTokens(alertMessage: AlertMessage): JSX.Element | string | null {
  if (!alertMessage) {
    return null;
  }

  let text = alertMessage.text;
  if (!alertMessage.tokens) {
    return text;
  }

  const timeTokens = alertMessage.tokens.filter(token => token.type === 'time');
  const linkTokens = alertMessage.tokens.filter(token => token.type === 'link');

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

    // TODO: we assume this is at the end, which works for now but will not always work
    const nonLinkText = text.replace(linkPart[0], '');
    element = (
      <Fragment>
        {nonLinkText}
        <EuiLink href={`#${linkToken.url}`}>{linkPart[1]}</EuiLink>
      </Fragment>
    );
  }

  return element;
}
