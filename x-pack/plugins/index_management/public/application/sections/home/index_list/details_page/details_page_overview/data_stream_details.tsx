/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiTextColor } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';

import { getTemplateDetailsLink } from '../../../../../..';
import { useLoadDataStream } from '../../../../../services/api';
import { useAppContext } from '../../../../../app_context';
import { humanizeTimeStamp } from '../../../data_stream_list/humanize_time_stamp';
import { OverviewCard } from './overview_card';

export const DataStreamDetails: FunctionComponent<{ dataStreamName: string }> = ({
  dataStreamName,
}) => {
  const { error, data: dataStream, isLoading } = useLoadDataStream(dataStreamName);
  const { history } = useAppContext();
  if (isLoading) {
    return <span>loading...</span>;
  }
  if (error || !dataStream) {
    return <span>error</span>;
  }
  return (
    <OverviewCard
      data-test-subj="indexDetailsDataStream"
      title={i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.dataStream.cardTitle', {
        defaultMessage: 'Data stream',
      })}
      content={{
        left: (
          <EuiFlexGroup gutterSize="xs" alignItems="baseline">
            <EuiFlexItem grow={false}>
              <EuiText
                css={css`
                  font-size: ${euiThemeVars.euiFontSizeL};
                `}
              >
                {dataStream.generation}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTextColor color="subdued">
                {i18n.translate(
                  'xpack.idxMgmt.indexDetails.overviewTab.dataStream.generationLabel',
                  {
                    defaultMessage: '{generations, plural, one {Generation} other {Generations}}',
                    values: { generations: dataStream.generation },
                  }
                )}
              </EuiTextColor>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        right: (
          <EuiButton
            size="s"
            {...reactRouterNavigate(history, getTemplateDetailsLink(dataStream.indexTemplateName))}
          >
            {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.dataStream.templateLinkLabel', {
              defaultMessage: 'See template',
            })}
          </EuiButton>
        ),
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
            <EuiFlexItem>
              <EuiTextColor color="subdued">
                {dataStream.maxTimeStamp
                  ? humanizeTimeStamp(dataStream.maxTimeStamp)
                  : i18n.translate(
                      'xpack.idxMgmt.indexDetails.overviewTab.dataStream.maxTimeStampNoneMessage',
                      {
                        defaultMessage: `Never`,
                      }
                    )}
              </EuiTextColor>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      }}
    />
  );
};
