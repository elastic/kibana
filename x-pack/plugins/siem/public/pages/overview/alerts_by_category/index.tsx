/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useEffect, useMemo } from 'react';

import { Position } from '@elastic/charts';
import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';
import { SHOWING, UNIT } from '../../../components/alerts_viewer/translations';
import { getDetectionEngineAlertUrl } from '../../../components/link_to/redirect_to_detection_engine';
import { MatrixHistogramContainer } from '../../../components/matrix_histogram';
import { useKibana, useUiSetting$ } from '../../../lib/kibana';
import { convertToBuildEsQuery } from '../../../lib/keury';
import {
  Filter,
  esQuery,
  IIndexPattern,
  Query,
} from '../../../../../../../../src/plugins/data/public';
import { inputsModel } from '../../../store';
import { HostsType } from '../../../store/hosts/model';

import * as i18n from '../translations';
import {
  alertsStackByOptions,
  histogramConfigs,
} from '../../../components/alerts_viewer/histogram_configs';
import { MatrixHisrogramConfigs } from '../../../components/matrix_histogram/types';

const ID = 'alertsByCategoryOverview';

const NO_FILTERS: Filter[] = [];
const DEFAULT_QUERY: Query = { query: '', language: 'kuery' };
const DEFAULT_STACK_BY = 'event.module';

interface Props {
  deleteQuery?: ({ id }: { id: string }) => void;
  filters?: Filter[];
  from: number;
  hideHeaderChildren?: boolean;
  indexPattern: IIndexPattern;
  query?: Query;
  setQuery: (params: {
    id: string;
    inspect: inputsModel.InspectQuery | null;
    loading: boolean;
    refetch: inputsModel.Refetch;
  }) => void;
  to: number;
}

const AlertsByCategoryComponent: React.FC<Props> = ({
  deleteQuery,
  filters = NO_FILTERS,
  from,
  hideHeaderChildren = false,
  indexPattern,
  query = DEFAULT_QUERY,
  setQuery,
  to,
}) => {
  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
  }, []);

  const kibana = useKibana();
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  const alertsCountViewAlertsButton = useMemo(
    () => <EuiButton href={getDetectionEngineAlertUrl()}>{i18n.VIEW_ALERTS}</EuiButton>,
    []
  );

  const alertsByCategoryHistogramConfigs: MatrixHisrogramConfigs = useMemo(
    () => ({
      ...histogramConfigs,
      defaultStackByOption:
        alertsStackByOptions.find(o => o.text === DEFAULT_STACK_BY) ?? alertsStackByOptions[0],
      getSubtitle: (totalCount: number) =>
        `${SHOWING}: ${numeral(totalCount).format(defaultNumberFormat)} ${UNIT(totalCount)}`,
      legendPosition: Position.Right,
    }),
    []
  );

  return (
    <MatrixHistogramContainer
      endDate={to}
      filterQuery={convertToBuildEsQuery({
        config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
        indexPattern,
        queries: [query],
        filters,
      })}
      headerChildren={hideHeaderChildren ? null : alertsCountViewAlertsButton}
      id={ID}
      setQuery={setQuery}
      sourceId="default"
      startDate={from}
      type={HostsType.page}
      {...alertsByCategoryHistogramConfigs}
    />
  );
};

AlertsByCategoryComponent.displayName = 'AlertsByCategoryComponent';

export const AlertsByCategory = React.memo(AlertsByCategoryComponent);
