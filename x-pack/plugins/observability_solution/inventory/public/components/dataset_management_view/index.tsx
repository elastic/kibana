/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import useAsync from 'react-use/lib/useAsync';
import {
  EuiLoadingSpinner,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiDescriptionList,
  formatNumber,
  EuiAccordion,
  EuiListGroup,
  EuiButton,
} from '@elastic/eui';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useKibana } from '../../hooks/use_kibana';

export function DatasetManagementView() {
  const {
    path: { id },
  } = useInventoryParams('/datastream/{id}/*');

  const {
    core: { http },
  } = useKibana();

  const path = `/internal/dataset_quality/data_streams/${id}/details`;

  /*
  Sample:
  {
    "docsCount": 25740,
    "degradedDocsCount": 4290,
    "services": {
        "service.name": [
            "synth-service-1",
            "synth-service-2",
            "synth-service-0"
        ]
    },
    "hosts": {
        "host.name": [
            "synth-host"
        ],
        "kubernetes.pod.uid": [],
        "container.id": [],
        "cloud.instance.id": [
            "8157600000000217",
            "8157600000000224",
            "8157600000000231",
            "8157600000000238",
            "8157600000000245",
            "8157600000000252",
            "8157600000000259",
            "8157600000000266",
            "8157600000000273",
            "8157600000000280",
            "8157600000000287",
            "8157600000000294",
            "8157600000000301",
            "8157600000000308",
            "8157600000000315",
            "8157600000000322",
            "8157600000000329",
            "8157600000000336",
            "8157600000000343",
            "8157600000000350",
            "8157600000000357",
            "8157600000000364",
            "8157600000000371",
            "8157600000000378",
            "8157600000000385",
            "8157600000000392",
            "8157600000000399",
            "8157600000000406",
            "8157600000000413",
            "8157600000000420",
            "8157600000000427",
            "8157600000000434",
            "8157600000000441",
            "8157600000000628",
            "8157600000000634",
            "8157600000000640",
            "8157600000000646",
            "8157600000000652",
            "8157600000000658",
            "8157600000000664",
            "8157600000000670",
            "8157600000000676",
            "8157600000000682",
            "8157600000000688",
            "8157600000000694",
            "8157600000000700",
            "8157600000000706",
            "8157600000000712",
            "8157600000000718",
            "8157600000000724",
            "8157600000000730"
        ],
        "aws.s3.bucket.name": [],
        "aws.rds.db_instance.arn": [],
        "aws.sqs.queue.name": []
    },
    "sizeBytes": 3786686,
    "lastActivity": 1726210893792,
    "userPrivileges": {
        "canMonitor": true
    }
}*/
  const details = useAsync(() => {
    return http.get(path, {
      query: {
        // start is now - 1 hour as iso string
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        // end is now as iso string
        end: new Date().toISOString(),
      },
    });
  }, [path, http]);

  return details.loading ? (
    <EuiLoadingSpinner />
  ) : (
    <>
      <StorageDetails details={details.value} />
      <EuiFlexGroup>
        <EuiButton
          data-test-subj="inventoryDatasetManagementViewSplitUpButton"
          href={`/app/observability/entities/datastream/${id}/management/split`}
        >
          {i18n.translate('xpack.inventory.datasetManagementView.splitUpButtonLabel', {
            defaultMessage: 'Split up or reroute',
          })}
        </EuiButton>
      </EuiFlexGroup>
      <EuiAccordion buttonContent="Advanced links" id={'sdfsdf'}>
        <EuiListGroup
          flush={true}
          bordered={true}
          listItems={[
            {
              label: 'Edit in stack management',
              href: `/app/management/data/index_management/data_streams/${id}`,
              iconType: 'indexSettings',
            },
            {
              label: 'View in data set quality',
              href: `/app/management/data/data_quality/details?pageState=(dataStream:${id},v:1)`,
              iconType: 'heart',
            },
          ]}
        />
      </EuiAccordion>
    </>
  );
}

function StorageDetails(props: { details: any }) {
  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText>
              <h5>
                {i18n.translate('xpack.inventory.details.h5.storageDetailsLabel', {
                  defaultMessage: 'Storage details',
                })}
              </h5>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="m" alignItems="flexEnd">
        <EuiDescriptionList
          type="column"
          listItems={[
            {
              title: 'Doc count',
              description: props.details.docsCount,
            },
            {
              title: 'Degraded docs',
              description: props.details.degradedDocsCount,
            },
            {
              title: 'Size in bytes',
              description: formatNumber(props.details.sizeBytes, '0.0 b'),
            },
          ]}
          style={{ maxWidth: '400px' }}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
