/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiEmptyPrompt,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { DatasourcesTable } from '.';
import { useRequest, useCore, sendRequest } from '../../../../hooks';
import { Datasource } from '../../../../types';

interface Props {
  policyId: string;
  existingDatasources: string[];
  onClose: () => void;
}

export const AssignDatasourcesFlyout: React.FunctionComponent<Props> = ({
  policyId,
  existingDatasources,
  onClose,
}) => {
  const core = useCore();
  const [selectedDatasources, setSelectedDatasources] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch data sources
  const {
    isLoading: isDatasourcesLoading,
    data: datasourcesData,
    error: datasourcesError,
    sendRequest: refreshDatasources,
  } = useRequest({
    path: '/api/ingest_manager/datasources',
    method: 'get',
    query: {
      page: 1,
      perPage: 10000,
    },
  });

  // Filter out data sources already assigned to policy
  const datasources: Datasource[] =
    datasourcesData?.items?.filter((ds: Datasource) => {
      return !existingDatasources.includes(ds.id);
    }) || [];

  const assignSelectedDatasources = async () => {
    setIsLoading(true);
    const { error } = await sendRequest({
      path: `/api/ingest_manager/agent_configs/${policyId}/addDatasources`,
      method: 'post',
      body: {
        datasources: selectedDatasources,
      },
    });
    setIsLoading(false);
    if (error) {
      core.notifications.toasts.addDanger(
        i18n.translate('xpack.ingestManager.assignDatasources.errorNotificationTitle', {
          defaultMessage:
            'Error assigning {count, plural, one {data source} other {# data sources}}',
          values: {
            count: selectedDatasources.length,
          },
        })
      );
    } else {
      core.notifications.toasts.addSuccess(
        i18n.translate('xpack.ingestManager.assignDatasources.successNotificationTitle', {
          defaultMessage:
            'Successfully assigned {count, plural, one {data source} other {# data sources}}',
          values: {
            count: selectedDatasources.length,
          },
        })
      );
      onClose();
    }
  };

  const InstallDatasourcesButton = (
    <EuiButton
      fill
      iconType="package"
      href={`${window.location.origin}${core.http.basePath.get()}/app/ingestManager#/epm`}
    >
      <FormattedMessage
        id="xpack.ingestManager.assignDatasources.installDatasourcesButtonText"
        defaultMessage="Install new data sources"
      />
    </EuiButton>
  );

  const header = (
    <EuiFlyoutHeader hasBorder aria-labelledby="FleetAssignDatasourcesFlyoutTitle">
      <EuiTitle size="m">
        <h2 id="FleetAssignDatasourcesFlyoutTitle">
          <FormattedMessage
            id="xpack.ingestManager.assignDatasources.flyoutTitle"
            defaultMessage="Assign data sources"
          />
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
  );

  const getTableMessage = () => {
    if (datasourcesError) {
      return (
        <FormattedMessage
          id="xpack.ingestManager.assignDatasources.errorLoadingDatasourcesMessage"
          defaultMessage="Unable to load data sources. {tryAgainLink}"
          values={{
            tryAgainLink: (
              <EuiLink onClick={() => refreshDatasources()}>
                <FormattedMessage
                  id="xpack.ingestManager.assignDatasources.retryLoadingDatasourcesLinkText"
                  defaultMessage="Try again"
                />
              </EuiLink>
            ),
          }}
        />
      );
    }

    if (datasourcesData && !datasourcesData.items.length) {
      return (
        <EuiEmptyPrompt
          title={
            <h2>
              <FormattedMessage
                id="xpack.ingestManager.assignDatasources.noDatasourcesPrompt"
                defaultMessage="You have no data sources"
              />
            </h2>
          }
          actions={InstallDatasourcesButton}
        />
      );
    }

    if (!datasources.length && existingDatasources.length) {
      return (
        <EuiEmptyPrompt
          body={
            <FormattedMessage
              id="xpack.ingestManager.assignDatasources.allDatasourcesAssignedPrompt"
              defaultMessage="You have assigned all available data sources to this policy"
            />
          }
          actions={InstallDatasourcesButton}
        />
      );
    }

    return null;
  };

  const body = (
    <EuiFlyoutBody>
      <DatasourcesTable
        datasources={datasources}
        withPoliciesCount={true}
        loading={isDatasourcesLoading}
        message={getTableMessage()}
        search={{
          toolsRight: [InstallDatasourcesButton],
          box: {
            incremental: true,
            schema: true,
          },
          filters: [
            {
              type: 'field_value_toggle',
              field: 'policies',
              value: 0,
              name: i18n.translate(
                'xpack.ingestManager.assignDatasources.unassignedFilterButtonLabel',
                {
                  defaultMessage: 'Unassigned',
                }
              ),
            },
          ],
        }}
        selection={{
          onSelectionChange: (selection: Array<{ id: string }>) =>
            setSelectedDatasources(selection.map(ds => ds.id)),
        }}
        isSelectable={true}
      />
    </EuiFlyoutBody>
  );

  const footer = (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
            <FormattedMessage
              id="xpack.ingestManager.assignDatasources.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            disabled={isLoading || !selectedDatasources.length}
            isLoading={isLoading}
            onClick={assignSelectedDatasources}
          >
            <FormattedMessage
              id="xpack.ingestManager.assignDatasources.submitButtonLabel"
              defaultMessage="Assign {count, plural, =0 {data sources} one {# data source} other {# data sources}}"
              values={{
                count: selectedDatasources.length,
              }}
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );

  return (
    <EuiFlyout onClose={onClose} size="m">
      {header}
      {body}
      {footer}
    </EuiFlyout>
  );
};
