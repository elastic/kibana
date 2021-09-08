/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import React, { useContext, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { find } from 'lodash';
import { useHistory } from 'react-router-dom';
import { PageTemplate } from '../page_template';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { GlobalStateContext } from '../../global_state_context';
import { TabMenuItem } from '../page_template';
import { ElasticsearchOverview } from '../../../components/elasticsearch';
import { ComponentProps } from '../../route_init';
import { Legacy } from '../../../legacy_shims';

export const ElasticsearchOverviewPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const history = useHistory();
  const { services } = useKibana<{ data: any }>();
  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  });
  // TODO: is this needed for the setup mode? x-pack/plugins/monitoring/public/directives/main/index.js#L258
  // TODO: this is needed to display tabs conditionally
  // const isCcrEnabled = cluster.isCcrEnabled;
  // const [clusters, setClusters] = useState([] as any);
  // const [loaded, setLoaded] = useState<boolean | null>(false);
  const [data, setData] = useState(null);
  const [showShardActivityHistory, setShowShardActivityHistory] = useState(false);
  const toggleShardActivityHistory = () => {
    setShowShardActivityHistory(!showShardActivityHistory);
  };
  const filterShardActivityData = (shardActivity: any) => {
    return shardActivity.filter((row: any) => {
      return showShardActivityHistory || row.stage !== 'DONE';
    });
  };

  // let tabs: TabMenuItem[] = [];

  const title = i18n.translate('xpack.monitoring.elasticsearch.overview.title', {
    defaultMessage: 'Elasticsearch',
  });

  const pageTitle = i18n.translate('xpack.monitoring.elasticsearch.overview.pageTitle', {
    defaultMessage: 'Elasticsearch overview',
  });

  // if (loaded) {
  //   tabs = [
  //     {
  //       id: 'clusterName',
  //       label: clusters[0].cluster_name,
  //       disabled: false,
  //       description: clusters[0].cluster_name,
  //       onClick: () => {},
  //       testSubj: 'clusterName',
  //     },
  //   ];
  // }

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/elasticsearch`;

    const response = await services.http?.fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        ccs,
        timeRange: {
          min: bounds.min.toISOString(),
          max: bounds.max.toISOString(),
        },
      }),
    });

    setData(response);
  }, [ccs, clusterUuid, services.data?.query.timefilter.timefilter, services.http]);

  let zoomInLevel = 0;
  // TODO: clear timeout on component destroy
  let deferTimer;

  const popstateHandler = () => zoomInLevel > 0 && --zoomInLevel;
  // TODO: remove listener on component destroy
  const removePopstateHandler = () => window.removeEventListener('popstate', popstateHandler);
  const addPopstateHandler = () => window.addEventListener('popstate', popstateHandler);

  const onBrush = ({ xaxis }) => {
    removePopstateHandler();
    const { to, from } = xaxis;
    const timezone = services.uiSettings?.get('dateFormat:tz');
    const offset = getOffsetInMS(timezone);
    Legacy.shims.timefilter.setTime({
      from: moment(from - offset),
      to: moment(to - offset),
      mode: 'absolute',
    });

    ++zoomInLevel;
    clearTimeout(deferTimer);
    /*
      Needed to defer 'popstate' event, so it does not fire immediately after it's added.
      10ms is to make sure the event is not added with the same code digest
    */
    deferTimer = setTimeout(() => addPopstateHandler(), 10);
  };

  const zoomInfo = {
    zoomOutHandler: () => history.goBack(),
    showZoomOutBtn: () => zoomInLevel > 0,
  };

  const renderOverview = (overviewData) => {
    if (overviewData === null) {
      return null;
    }
    const { clusterStatus, metrics, shardActivity, logs } = overviewData || {};
    const shardActivityData = shardActivity && filterShardActivityData(shardActivity); // no filter on data = null

    return (
      <ElasticsearchOverview
        clusterStatus={clusterStatus}
        metrics={metrics}
        logs={logs}
        cluster={cluster}
        shardActivity={shardActivityData}
        onBrush={onBrush}
        showShardActivityHistory={showShardActivityHistory}
        toggleShardActivityHistory={toggleShardActivityHistory}
        zoomInfo={zoomInfo}
      />
    );
  };

  return (
    <PageTemplate
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      data-test-subj="elasticsearchOverviewPage"
    >
      {renderOverview(data)}
    </PageTemplate>
  );
};

const getOffsetInMS = (timezone) => {
  if (timezone === 'Browser') {
    return 0;
  }
  const offsetInMinutes = moment.tz(timezone).utcOffset();
  const offsetInMS = offsetInMinutes * 1 * 60 * 1000;
  return offsetInMS;
};
