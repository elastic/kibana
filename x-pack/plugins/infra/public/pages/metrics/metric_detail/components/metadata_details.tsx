/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState, useCallback, useMemo } from 'react';
import { EuiButtonIcon, EuiFlexGrid, EuiFlexItem, EuiTitle, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { InfraMetadata } from '../../../../../common/http_api';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import { MetadataContext } from '../containers/metadata_context';

interface FieldDef {
  field: string;
  label: string;
  isBoolean?: boolean;
}

const FIELDS = [
  {
    field: 'cloud.instance.id',
    label: i18n.translate('xpack.infra.nodeDetails.labels.instanceId', {
      defaultMessage: 'Instance ID',
    }),
  },
  {
    field: 'cloud.provider',
    label: i18n.translate('xpack.infra.nodeDetails.labels.cloudProvider', {
      defaultMessage: 'Cloud Provider',
    }),
  },
  {
    field: 'host.os.name',
    label: i18n.translate('xpack.infra.nodeDetails.labels.operatinSystem', {
      defaultMessage: 'Operating System',
    }),
  },
  {
    field: 'host.os.kernel',
    label: i18n.translate('xpack.infra.nodeDetails.labels.kernelVersion', {
      defaultMessage: 'Kernel Version',
    }),
  },
  {
    field: 'host.hostname',
    label: i18n.translate('xpack.infra.nodeDetails.labels.hostname', {
      defaultMessage: 'Hostname',
    }),
  },
  {
    field: 'host.containerized',
    label: i18n.translate('xpack.infra.nodeDetails.labels.containerized', {
      defaultMessage: 'Containerized',
    }),
    isBoolean: true,
  },
  {
    field: 'cloud.project.id',
    label: i18n.translate('xpack.infra.nodeDetails.labels.projectId', {
      defaultMessage: 'Project ID',
    }),
  },
  {
    field: 'cloud.availability_zone',
    label: i18n.translate('xpack.infra.nodeDetails.labels.availabilityZone', {
      defaultMessage: 'Availability Zone',
    }),
  },
  {
    field: 'cloud.machine.type',
    label: i18n.translate('xpack.infra.nodeDetails.labels.machineType', {
      defaultMessage: 'Machine Type',
    }),
  },
  {
    field: 'cloud.instance.name',
    label: i18n.translate('xpack.infra.nodeDetails.labels.instanceName', {
      defaultMessage: 'Instance Name',
    }),
  },
] as FieldDef[];

const getLabelForField = ({ field }: FieldDef) => {
  const fieldDef = FIELDS.find((f) => f.field === field);
  if (!fieldDef) return field;
  return fieldDef.label;
};

const getValueForField = (metadata: InfraMetadata, { field, isBoolean }: FieldDef) => {
  if (isBoolean) {
    return get(metadata.info, field, false)
      ? i18n.translate('xpack.infra.nodeDetails.yes', { defaultMessage: 'Yes' })
      : i18n.translate('xpack.infra.nodeDetails.no', { defaultMessage: 'No' });
  }
  const value = get(metadata.info, field, '--');
  return value;
};

interface Props {
  fields?: string[];
}

const NUMBER_OF_COLUMNS = 4;

export const MetadataDetails = (props: Props) => {
  const [isOpen, setControlState] = useState<boolean>(false);

  const toggleIsOpen = useCallback(
    () => (isOpen ? setControlState(false) : setControlState(true)),
    [isOpen]
  );

  const filteredFields = useMemo(() => {
    if (props.fields && props.fields.length) {
      return props.fields
        .map((field) => {
          const fieldDef = FIELDS.find((f) => f.field === field);
          if (fieldDef) {
            return fieldDef;
          }
        })
        .filter((f) => f) as FieldDef[];
    } else {
      return FIELDS;
    }
  }, [props.fields]);
  const fields = useMemo(
    () => (isOpen ? filteredFields : filteredFields.slice(0, NUMBER_OF_COLUMNS)),
    [filteredFields, isOpen]
  );
  const metadata = useContext(MetadataContext);

  if (!metadata) {
    return null;
  }

  return (
    <MetadataContainer>
      {filteredFields.length > NUMBER_OF_COLUMNS ? (
        <Controls>
          <EuiButtonIcon
            iconType={isOpen ? 'arrowUp' : 'arrowDown'}
            onClick={toggleIsOpen}
            aria-label={i18n.translate('xpack.infra.nodeDetails.labels.showMoreDetails', {
              defaultMessage: 'Show more details',
            })}
          />
        </Controls>
      ) : null}
      <EuiFlexGrid columns={NUMBER_OF_COLUMNS} style={{ flexGrow: 1 }} gutterSize="s">
        {fields.map((field) => (
          <EuiFlexItem key={field.field} style={{ minWidth: 0 }}>
            <EuiTitle size="xs">
              <h5>{getLabelForField(field)}</h5>
            </EuiTitle>
            <EuiText>{getValueForField(metadata, field)}</EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </MetadataContainer>
  );
};

const MetadataContainer = euiStyled.div`
border-top: ${(props) => props.theme.eui.euiBorderWidthThin} solid ${(props) =>
  props.theme.eui.euiBorderColor};
border-bottom: ${(props) => props.theme.eui.euiBorderWidthThin} solid ${(props) =>
  props.theme.eui.euiBorderColor};
padding: ${(props) => props.theme.eui.paddingSizes.m} 0;
margin-bottom: ${(props) => props.theme.eui.paddingSizes.m};
display: flex;
`;

const Controls = euiStyled.div`
flex-grow: 0;
margin-right: ${(props) => props.theme.eui.paddingSizes.m};
min-width: 0px;
`;
