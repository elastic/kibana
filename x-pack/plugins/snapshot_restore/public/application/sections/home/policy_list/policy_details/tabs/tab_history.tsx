/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiTitle,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiText,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';

import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { SlmPolicy } from '../../../../../../../common/types';
import { EuiCodeEditor } from '../../../../../../shared_imports';
import { FormattedDateTime } from '../../../../../components';
import { linkToSnapshot } from '../../../../../services/navigation';
import { useServices } from '../../../../../app_context';

interface Props {
  policy: SlmPolicy;
}

export const TabHistory: React.FunctionComponent<Props> = ({ policy }) => {
  const { lastSuccess, lastFailure, nextExecutionMillis, name, repository } = policy;
  const { history } = useServices();

  const renderLastSuccess = () => {
    if (!lastSuccess) {
      return null;
    }
    const { time, snapshotName } = lastSuccess;

    return (
      <Fragment>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyDetails.lastSuccessTitle"
              defaultMessage="Last successful snapshot"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <EuiDescriptionList textStyle="reverse">
          <EuiFlexGroup>
            <EuiFlexItem data-test-subj="successDate">
              <EuiDescriptionListTitle data-test-subj="title">
                <FormattedMessage
                  id="xpack.snapshotRestore.policyDetails.lastSuccess.dateLabel"
                  defaultMessage="Date"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
                <FormattedDateTime epochMs={time} />
              </EuiDescriptionListDescription>
            </EuiFlexItem>

            <EuiFlexItem data-test-subj="successSnapshot">
              <EuiDescriptionListTitle data-test-subj="title">
                <FormattedMessage
                  id="xpack.snapshotRestore.policyDetails.lastSuccess.snapshotNameLabel"
                  defaultMessage="Snapshot name"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
                <EuiLink
                  {...reactRouterNavigate(history, linkToSnapshot(repository, snapshotName))}
                >
                  {snapshotName}
                </EuiLink>
              </EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiDescriptionList>
      </Fragment>
    );
  };

  const renderLastFailure = () => {
    if (!lastFailure) {
      return null;
    }
    const { time, snapshotName, details } = lastFailure;

    return (
      <Fragment>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyDetails.lastFailureTitle"
              defaultMessage="Last snapshot failure"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <EuiDescriptionList textStyle="reverse">
          <EuiFlexGroup>
            <EuiFlexItem data-test-subj="failureDate">
              <EuiDescriptionListTitle data-test-subj="title">
                <FormattedMessage
                  id="xpack.snapshotRestore.policyDetails.lastFailure.dateLabel"
                  defaultMessage="Date"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
                <FormattedDateTime epochMs={time} />
              </EuiDescriptionListDescription>
            </EuiFlexItem>

            <EuiFlexItem data-test-subj="failureSnapshot">
              <EuiDescriptionListTitle data-test-subj="title">
                <FormattedMessage
                  id="xpack.snapshotRestore.policyDetails.lastFailure.snapshotNameLabel"
                  defaultMessage="Snapshot name"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
                {snapshotName}
              </EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiFlexGroup>
            <EuiFlexItem data-test-subj="failureDetails">
              <EuiDescriptionListTitle data-test-subj="title">
                <FormattedMessage
                  id="xpack.snapshotRestore.policyDetails.lastFailure.detailsLabel"
                  defaultMessage="Details"
                />
              </EuiDescriptionListTitle>
              <EuiSpacer size="s" />
              <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
                <EuiCodeEditor
                  mode="json"
                  theme="textmate"
                  width="100%"
                  isReadOnly
                  value={JSON.stringify(details, null, 2)}
                  setOptions={{
                    showLineNumbers: false,
                    tabSize: 2,
                  }}
                  editorProps={{
                    $blockScrolling: Infinity,
                  }}
                  minLines={6}
                  maxLines={12}
                  wrapEnabled={true}
                  showGutter={false}
                  aria-label={i18n.translate(
                    'xpack.snapshotRestore.policyDetails.lastFailure.detailsAriaLabel',
                    {
                      defaultMessage: `Last failure details for policy '{name}'`,
                      values: { name },
                    }
                  )}
                />
              </EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiDescriptionList>
      </Fragment>
    );
  };

  return lastSuccess || lastFailure ? (
    <Fragment>
      {renderLastSuccess()}
      {lastSuccess && lastFailure ? <EuiHorizontalRule /> : null}
      {renderLastFailure()}
    </Fragment>
  ) : (
    <EuiText>
      <p>
        <FormattedMessage
          id="xpack.snapshotRestore.policyDetails.noHistoryMessage"
          defaultMessage="This policy will run on {date} at {time}."
          values={{
            date: <FormattedDateTime epochMs={nextExecutionMillis} type="date" />,
            time: <FormattedDateTime epochMs={nextExecutionMillis} type="time" />,
          }}
        />
      </p>
    </EuiText>
  );
};
