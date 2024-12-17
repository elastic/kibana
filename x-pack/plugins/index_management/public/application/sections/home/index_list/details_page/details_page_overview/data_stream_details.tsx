/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiTextColor } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { SectionLoading } from '@kbn/es-ui-shared-plugin/public';

import { FormattedMessage } from '@kbn/i18n-react';
import { getDataStreamDetailsLink, getTemplateDetailsLink } from '../../../../../services/routing';
import { useLoadDataStream } from '../../../../../services/api';
import { useAppContext } from '../../../../../app_context';
import { humanizeTimeStamp } from '../../../data_stream_list/humanize_time_stamp';
import { OverviewCard } from './overview_card';

export const DataStreamDetails: FunctionComponent<{ dataStreamName: string }> = ({
  dataStreamName,
}) => {
  const { error, data: dataStream, isLoading, resendRequest } = useLoadDataStream(dataStreamName);
  const {
    core: { getUrlForApp },
  } = useAppContext();
  const hasError = !isLoading && (error || !dataStream);
  let contentLeft: ReactNode = (
    <EuiFlexGroup gutterSize="xs" alignItems="baseline">
      <EuiFlexItem grow={false}>
        <EuiText
          css={css`
            font-size: ${euiThemeVars.euiFontSizeL};
          `}
        >
          {dataStream?.generation}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTextColor color="subdued">
          {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.dataStream.generationLabel', {
            defaultMessage: '{generations, plural, one {Generation} other {Generations}}',
            values: { generations: dataStream?.generation },
          })}
        </EuiTextColor>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
  let contentRight: ReactNode = (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiButton
          size="s"
          target="_blank"
          href={getUrlForApp('management', {
            path: `data/index_management${getDataStreamDetailsLink(dataStream?.name ?? '')}`,
          })}
        >
          {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.dataStream.dataStreamLinkLabel', {
            defaultMessage: 'See details',
          })}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton
          size="s"
          target="_blank"
          href={getUrlForApp('management', {
            path: `data/index_management${getTemplateDetailsLink(
              dataStream?.indexTemplateName ?? ''
            )}`,
          })}
        >
          {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.dataStream.templateLinkLabel', {
            defaultMessage: 'Related template',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  if (isLoading) {
    contentLeft = (
      <SectionLoading inline={true}>
        <FormattedMessage
          id="xpack.idxMgmt.indexDetails.overviewTab.dataStream.loadingDescription"
          defaultMessage="Loading data stream details…"
        />
      </SectionLoading>
    );
    contentRight = null;
  }
  if (hasError) {
    contentLeft = (
      <EuiText grow={false}>
        <EuiTextColor color="warning">
          <FormattedMessage
            id="xpack.idxMgmt.indexDetails.overviewTab.dataStream.errorDescription"
            defaultMessage="Unable to load data stream details"
          />
        </EuiTextColor>
      </EuiText>
    );
    contentRight = (
      <EuiButton
        color="warning"
        onClick={resendRequest}
        data-test-subj="indexDetailsDataStreamReload"
      >
        <FormattedMessage
          id="xpack.idxMgmt.indexDetails.overviewTab.dataStream.reloadButtonLabel"
          defaultMessage="Reload"
        />
      </EuiButton>
    );
  }
  return (
    <OverviewCard
      data-test-subj="indexDetailsDataStream"
      title={i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.dataStream.cardTitle', {
        defaultMessage: 'Data stream',
      })}
      content={{
        left: contentLeft,
        right: contentRight,
      }}
      footer={{
        left: (
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiIcon type="calendar" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.dataStream.lastUpdateLabel', {
                defaultMessage: 'Last update',
              })}
            </EuiFlexItem>
            {!isLoading && !hasError && (
              <EuiFlexItem>
                <EuiTextColor color="subdued">
                  {dataStream?.maxTimeStamp
                    ? humanizeTimeStamp(dataStream.maxTimeStamp)
                    : i18n.translate(
                        'xpack.idxMgmt.indexDetails.overviewTab.dataStream.maxTimeStampNoneMessage',
                        {
                          defaultMessage: `Never`,
                        }
                      )}
                </EuiTextColor>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      }}
    />
  );
};
