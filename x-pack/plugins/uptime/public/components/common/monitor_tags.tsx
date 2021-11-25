/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiBadge, EuiBadgeGroup, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { Ping } from '../../../common/runtime_types/ping';
import { MonitorSummary } from '../../../common/runtime_types/monitor';
import { useFilterUpdate } from '../../hooks/use_filter_update';
import { useGetUrlParams } from '../../hooks';
import { parseCurrentFilters } from '../overview/monitor_list/columns/monitor_name_col';
import { EXPAND_TAGS_LABEL } from '../overview/monitor_list/columns/translations';
import { OVERVIEW_ROUTE } from '../../../common/constants';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

interface Props {
  ping?: Ping | null;
  summary?: MonitorSummary;
}

const getTagsFromSummary = (summary: MonitorSummary) => {
  let tags = new Set<string>();
  summary.state.summaryPings.forEach((ping) => {
    tags = new Set([...tags, ...(ping?.tags ?? [])]);
  });

  return [...tags];
};

const getTagsFromPing = (ping: Ping) => {
  return ping?.tags ?? [];
};

const getFilterLabel = (tag: string) => {
  return i18n.translate('xpack.uptime.monitorList.tags.filter', {
    defaultMessage: 'Filter all monitors with tag {tag}',
    values: {
      tag,
    },
  });
};

export const MonitorTags = ({ ping, summary }: Props) => {
  const history = useHistory();

  const {
    services: { docLinks },
  } = useKibana();

  const [toDisplay, setToDisplay] = useState(5);

  let tags: string[];

  if (summary) {
    // summary in case of monitor list
    tags = getTagsFromSummary(summary!);
  } else {
    tags = getTagsFromPing(ping!);
  }

  const tagsToDisplay = tags.slice(0, toDisplay);

  const { absoluteDateRangeStart, absoluteDateRangeEnd, ...params } = useGetUrlParams();

  const currFilters = parseCurrentFilters(params.filters);

  const [tagFilters, setTagFilters] = useState<string[]>(currFilters.get('tags') ?? []);

  const excludedTagFilters = useMemo(() => {
    const currExcludedFilters = parseCurrentFilters(params.excludedFilters);
    return currExcludedFilters.get('tags') ?? [];
  }, [params.excludedFilters]);

  useFilterUpdate('tags', tagFilters, excludedTagFilters);

  if (tags.length === 0) {
    return summary ? null : (
      <EuiLink
        href={docLinks?.links.heartbeat.base + '/monitor-options.html#monitor-tags'}
        target="_blank"
      >
        Set tags
      </EuiLink>
    );
  }

  return (
    <EuiBadgeGroup>
      {tagsToDisplay.map((tag) =>
        // filtering only makes sense in monitor list, where we have summary
        summary ? (
          <EuiBadge
            key={tag}
            title={getFilterLabel(tag)}
            onClick={() => {
              setTagFilters([tag]);
            }}
            onClickAriaLabel={getFilterLabel(tag)}
            color="hollow"
            className="eui-textTruncate"
            style={{ maxWidth: 120 }}
          >
            {tag}
          </EuiBadge>
        ) : (
          <EuiBadge
            key={tag}
            color="hollow"
            className="eui-textTruncate"
            style={{ maxWidth: 120 }}
            href={history.createHref({
              pathname: OVERVIEW_ROUTE,
              search: `filters=[["tags",["${tag}"]]]`,
            })}
          >
            {tag}
          </EuiBadge>
        )
      )}
      {tags.length > toDisplay && (
        <EuiBadge
          color="hollow"
          onClick={() => {
            setToDisplay(tags.length);
          }}
          onClickAriaLabel={EXPAND_TAGS_LABEL}
        >
          +{tags.length - 5}
        </EuiBadge>
      )}
    </EuiBadgeGroup>
  );
};
