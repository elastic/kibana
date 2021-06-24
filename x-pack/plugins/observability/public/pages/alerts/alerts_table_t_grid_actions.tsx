/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RULE_ID, RULE_NAME } from '@kbn/rule-data-utils/target/technical_field_names';
import React, { useState } from 'react';
import { format, parse } from 'url';

import { parseTechnicalFields } from '../../../../rule_registry/common/parse_technical_fields';
import type { ActionProps } from '../../../../timelines/common';
import { asDuration, asPercent } from '../../../common/utils/formatters';
import { usePluginContext } from '../../hooks/use_plugin_context';

export function RowCellActionsRender({ data }: ActionProps) {
  const { core, observabilityRuleTypeRegistry } = usePluginContext();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { prepend } = core.http.basePath;
  const dataFieldEs = data.reduce((acc, d) => ({ ...acc, [d.field]: d.value }), {});
  const parsedFields = parseTechnicalFields(dataFieldEs);
  const formatter = observabilityRuleTypeRegistry.getFormatter(parsedFields[RULE_ID]!);
  const formatted = {
    link: undefined,
    reason: parsedFields[RULE_NAME]!,
    ...(formatter?.({ fields: parsedFields, formatters: { asDuration, asPercent } }) ?? {}),
  };

  const parsedLink = formatted.link ? parse(formatted.link, true) : undefined;
  const link = parsedLink
    ? format({
        ...parsedLink,
        query: {
          ...parsedLink.query,
          rangeFrom: 'now-24h',
          rangeTo: 'now',
        },
      })
    : undefined;
  return (
    <div>
      <EuiPopover
        isOpen={isPopoverOpen}
        panelPaddingSize="s"
        anchorPosition="upCenter"
        button={
          <EuiButtonIcon
            aria-label="show actions"
            iconType="boxesHorizontal"
            color="text"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          />
        }
        closePopover={() => setIsPopoverOpen(false)}
      >
        <EuiPopoverTitle>Actions</EuiPopoverTitle>
        <div style={{ width: 150 }}>
          <EuiButtonEmpty href={prepend(link ?? '')}>
            <EuiFlexGroup alignItems="center" component="span" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonIcon aria-label="view in app" iconType="link" color="text" />
              </EuiFlexItem>
              <EuiFlexItem>
                {i18n.translate('xpack.observability.alertsTable.viewInAppButtonLabel', {
                  defaultMessage: 'View in app',
                })}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiButtonEmpty>
        </div>
      </EuiPopover>
    </div>
  );
}
