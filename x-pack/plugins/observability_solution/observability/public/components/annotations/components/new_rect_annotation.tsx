/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RectAnnotation } from '@elastic/charts';
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import moment from 'moment';
import { useFormContext } from 'react-hook-form';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import { Annotation, CreateAnnotationParams } from '../../../../common/annotations';

export function NewRectAnnotation({
  sloId,
  sloInstanceId,
  isCreateOpen,
}: {
  sloId?: string;
  sloInstanceId?: string;
  isCreateOpen: boolean;
}) {
  const { watch, getValues } = useFormContext<CreateAnnotationParams>();
  const timestamp = watch('@timestamp');
  const timestampEnd = watch('@timestampEnd');

  if (!timestamp || !timestampEnd || !isCreateOpen) {
    return null;
  }
  const annotation = watch('annotation');
  const values = getValues();
  return (
    <ObsRectAnnotation
      annotation={{
        ...values,
        annotation,
        ...(sloId ? { slo: { id: sloId, instanceId: sloInstanceId } } : {}),
      }}
    />
  );
}

export function ObsRectAnnotation({
  annotation,
}: {
  annotation: Annotation | CreateAnnotationParams;
}) {
  const message = annotation.message;
  const timestamp = annotation['@timestamp'];
  const timestampEnd = annotation['@timestampEnd'];
  const { euiTheme } = useEuiTheme();

  const color = annotation.annotation?.style?.color ?? euiTheme.colors.warning;

  return (
    <RectAnnotation
      dataValues={[
        {
          coordinates: {
            x0: moment(timestamp).valueOf(),
            x1: moment(timestampEnd).valueOf(),
          },
          details: message,
        },
      ]}
      id={'id' in annotation ? annotation.id : `${timestamp}${message}`}
      style={{ fill: color, opacity: 1 }}
      outside={annotation.annotation.style?.rect?.fill === 'outside'}
      outsideDimension={14}
      {...(annotation.annotation.style?.rect?.position === 'top' && {
        groupId: 'secondary',
      })}
      customTooltip={() => (
        <EuiPanel
          color="plain"
          hasShadow={false}
          hasBorder={false}
          paddingSize="xs"
          borderRadius="none"
        >
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiIcon type="stopFilled" color={color} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup>
                <EuiFlexItem grow={true}>
                  <EuiTitle size="xxxs">
                    <h2>{annotation.name}</h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {(annotation.tags ?? []).length > 0 && (
                    <EuiFlexItem>
                      <TagsList tags={annotation.tags} color="default" />
                    </EuiFlexItem>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiFlexItem>
                <EuiText size="s">
                  {`${moment(timestamp).format('LLL')} — ${moment(timestampEnd).format('LLL')}`}
                </EuiText>
              </EuiFlexItem>
              <EuiHorizontalRule margin="xs" />
              <EuiFlexItem>
                <EuiText size="s">{message}</EuiText>
              </EuiFlexItem>

              <EuiSpacer size="s" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      )}
    />
  );
}
