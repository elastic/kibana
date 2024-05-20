/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useLogViewContext } from '@kbn/logs-shared-plugin/public';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiBadge, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { fullHeightContentStyles } from '../../../../page_template.styles';
import { LogsPageTemplate, LogsPageTemplateProps } from '../../shared/page_template';

export const LogStreamPageTemplate: React.FC<LogsPageTemplateProps> = (props) => {
  const { logView, isInlineLogView, revertToDefaultLogView } = useLogViewContext();
  return (
    <div className={APP_WRAPPER_CLASS}>
      <LogsPageTemplate
        pageHeader={{
          pageTitle:
            isInlineLogView && logView ? (
              <EuiFlexGroup alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>{logView.attributes.name}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={
                      <FormattedMessage
                        id="xpack.infra.logStreamPageTemplate.widgetDescription"
                        defaultMessage="You are viewing an embedded widget. Changes will be synchronized to the URL, but they will not be persisted to the default Logs Stream view."
                      />
                    }
                  >
                    <EuiBadge color="hollow">
                      <FormattedMessage
                        id="xpack.infra.logStreamPageTemplate.widgetBadge"
                        defaultMessage="Widget"
                      />
                    </EuiBadge>
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              streamTitle
            ),
          breadcrumbs: isInlineLogView
            ? [
                {
                  text: (
                    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                      <EuiFlexItem>
                        <EuiIcon size="s" type="arrowLeft" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <FormattedMessage
                          id="xpack.infra.logStreamPageTemplate.backtoLogsStream"
                          defaultMessage="Back to Logs Stream"
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ),
                  color: 'primary',
                  'aria-current': false,
                  'data-test-subj': 'infraAssetDetailsReturnButton',
                  href: '#',
                  onClick: revertToDefaultLogView,
                },
              ]
            : undefined,
        }}
        pageSectionProps={{
          contentProps: {
            css: fullHeightContentStyles,
          },
        }}
        {...props}
      />
    </div>
  );
};

const streamTitle = i18n.translate('xpack.infra.logs.streamPageTitle', {
  defaultMessage: 'Stream',
});
