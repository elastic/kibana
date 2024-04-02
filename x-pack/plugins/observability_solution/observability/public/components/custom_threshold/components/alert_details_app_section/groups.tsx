/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { SERVICE_NAME } from '@kbn/observability-shared-plugin/common';
import { useKibana } from '../../../../utils/kibana_react';
import { TimeRange, Group } from '../../../../../common/custom_threshold_rule/types';
import { generateSourceLink } from '../../../../../common/custom_threshold_rule/helpers/get_alert_source_links';
import { APM_APP_LOCATOR_ID } from '../../../../../common/custom_threshold_rule/get_apm_app_url';

export function Groups({ groups, timeRange }: { groups: Group[]; timeRange: TimeRange }) {
  const {
    http: {
      basePath: { prepend },
    },
    share: {
      url: { locators },
    },
  } = useKibana().services;

  const [sourceLinks, setSourceLinks] = useState<Record<string, string | undefined>>({});

  const serviceName = groups.find((group) => group.field === SERVICE_NAME)?.value;

  useEffect(() => {
    if (!groups) return;

    let links: Record<string, string | undefined> = {};

    groups.map((group) => {
      const link = generateSourceLink(
        group,
        timeRange,
        prepend,
        serviceName,
        locators.get(APM_APP_LOCATOR_ID)
      );
      links = {
        ...links,
        [group.field]: link,
      };
    });

    setSourceLinks(links);
  }, [groups, locators, prepend, serviceName, timeRange]);

  return (
    <>
      {groups &&
        groups.map((group) => {
          return (
            <span key={group.field}>
              {group.field}:{' '}
              {sourceLinks[group.field] ? (
                <EuiLink
                  data-test-subj="o11yCustomThresholdAlertSourceLink"
                  href={sourceLinks[group.field]}
                  target="_blank"
                >
                  {group.value}
                </EuiLink>
              ) : (
                <strong>{group.value}</strong>
              )}
              <br />
            </span>
          );
        })}
    </>
  );
}
