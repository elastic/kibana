/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore formatNumber
import { formatNumber } from '@elastic/eui/lib/services/format';
import {
  EuiCallOut,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiBadge,
  EuiText,
  EuiPopover,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPanel } from '@elastic/eui';
import { Ping, HttpResponseBody } from '../../../../common/runtime_types';
import { DocLinkForBody } from './doc_link_body';
import { PingRedirects } from './ping_redirects';
import { ScriptExpandedRow } from '../synthetics/script_expanded_row';

interface Props {
  ping: Ping;
}

const BodyDescription = ({ body }: { body: HttpResponseBody }) => {
  const contentBytes = body.content_bytes || 0;
  const bodyBytes = body.bytes || 0;

  const truncatedText =
    contentBytes > 0 && contentBytes < bodyBytes
      ? i18n.translate('xpack.uptime.pingList.expandedRow.truncated', {
          defaultMessage: 'Showing first {contentBytes} bytes.',
          values: { contentBytes },
        })
      : null;
  const bodySizeText =
    bodyBytes > 0
      ? i18n.translate('xpack.uptime.pingList.expandedRow.bodySize', {
          defaultMessage: 'Body size is {bodyBytes}.',
          values: { bodyBytes: formatNumber(bodyBytes, '0b') },
        })
      : null;
  const combinedText = [truncatedText, bodySizeText].filter((s) => s).join(' ');

  return <EuiText>{combinedText}</EuiText>;
};

const BodyExcerpt = ({ content }: { content: string }) =>
  content ? <EuiCodeBlock overflowHeight={250}>{content}</EuiCodeBlock> : null;

export const PingListExpandedRowComponent = ({ ping }: Props) => {
  const listItems = [];

  if (ping.monitor.type === 'suitejourney') {
    return <ScriptExpandedRow checkGroup={ping.monitor.check_group} />;
  }

  // Show the error block
  if (ping.error) {
    listItems.push({
      title: i18n.translate('xpack.uptime.pingList.expandedRow.error', { defaultMessage: 'Error' }),
      description: <EuiText>{ping.error.message}</EuiText>,
    });
  }

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  // Show the journey
  const journeyItems =
    ping.script?.journey?.steps?.map((s) => {
      const onButtonClick = () => setIsPopoverOpen((isPopoverOpen) => !isPopoverOpen);
      const closePopover = () => setIsPopoverOpen(false);

      const thumbnail = (
        <img
          style={{ width: 'auto', height: 'auto', maxWidth: '150px', maxHeight: '150px' }}
          onClick={onButtonClick}
          src={'data:image/png;charset=utf-8;base64, ' + s.screenshot}
        />
      );
      const description = (
        <EuiPopover button={thumbnail} isOpen={isPopoverOpen} closePopover={closePopover}>
          <img
            style={{ width: '600px' }}
            src={'data:image/png;charset=utf-8;base64, ' + s.screenshot}
          />
        </EuiPopover>
      );

      let color = 'primary';
      let icon = 'checkInCircleFilled';
      let message = 'Succeeded';
      if (s.status === 'failed') {
        color = 'danger';
        icon = 'crossInACircleFilled';
        message = `Failure (${s.error.name})`;
      } else if (s.status === 'skipped') {
        color = 'hollow';
        icon = 'questionInCircle';
        message = 'Skipped';
      }

      const title = (
        <>
          <EuiText>{s.name}</EuiText>
          <EuiBadge color={color} iconType={icon} iconSide="left">
            {message}
          </EuiBadge>
          <EuiCodeBlock>{s.source}</EuiCodeBlock>
        </>
      );

      return {
        title,
        description,
      };
    }) ?? [];
  console.log(ping);
  if (ping.script?.journey) {
    listItems.push({
      title: i18n.translate('xpack.uptime.pingList.expandedRow.journey', {
        defaultMessage: 'Journey',
      }),
      description: (
        <EuiPanel>
          <EuiDescriptionList type="responsiveColumn" listItems={journeyItems} />
        </EuiPanel>
      ),
    });
  }

  // Show the body, if present
  if (ping.http?.response?.body) {
    const body = ping.http.response.body;

    listItems.push({
      title: i18n.translate('xpack.uptime.pingList.expandedRow.response_body', {
        defaultMessage: 'Response Body',
      }),
      description: (
        <>
          <BodyDescription body={body} />
          <EuiSpacer size={'s'} />
          {body.content ? <BodyExcerpt content={body.content || ''} /> : <DocLinkForBody />}
        </>
      ),
    });
  }
  return (
    <EuiFlexGroup direction="column">
      {ping?.http?.response?.redirects && (
        <EuiFlexItem>
          <PingRedirects monitorStatus={ping} showTitle={true} />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiCallOut color={ping?.error ? 'danger' : 'primary'}>
          <EuiDescriptionList listItems={listItems} />
        </EuiCallOut>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
