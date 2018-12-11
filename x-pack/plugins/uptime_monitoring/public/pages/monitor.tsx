/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore No typings for EuiAreaSeries
  EuiAreaSeries,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  // @ts-ignore No typings for EuiLineSeries
  EuiLineSeries,
  EuiPanel,
  // @ts-ignore No typings for EuiSeriesChart
  EuiSeriesChart,
  // @ts-ignore No typings for EuiSeriesChartUtils
  EuiSeriesChartUtils,
  // @ts-ignore No typings for EuiSpacer
  EuiSpacer,
  // @ts-ignore No typings for EuiSuperSelect
  EuiSuperSelect,
  EuiTitle,
} from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { getMonitorPageBreadcrumb } from '../breadcrumbs';
import { UMUpdateBreadcrumbs } from '../lib/lib';

interface MonitorPageProps {
  updateBreadcrumbs: UMUpdateBreadcrumbs;
  match: { params: { id: string } };
}

export class MonitorPage extends React.Component<MonitorPageProps> {
  constructor(props: MonitorPageProps) {
    super(props);
  }

  public componentWillMount() {
    this.props.updateBreadcrumbs(getMonitorPageBreadcrumb());
  }

  public render() {
    let { id } = this.props.match.params;
    const example = JSON.parse(exampleData);
    const google = example[2];
    const maxRtt: any[] = [];
    const minRtt: any[] = [];
    const avgRtt: any[] = [];
    const areaRtt: any[] = [];
    id = google.key;
    google.series.forEach(({ avg, max, min }: { avg: any; max: any; min: any }) => {
      maxRtt.push(max);
      minRtt.push(min);
      avgRtt.push(avg);
      areaRtt.push({ x: min.x, y0: min.y, y: max.y });
    });
    const selectOptions = [{ value: 'http@https://www.google.com', inputDisplay: <EuiHealth color="success" style={{ lineHeight: 'inherit'}}>https://www.google.com</EuiHealth>}];
    const rttexample = JSON.parse(rttsampledata);
    const rttcontent: any[] = [];
    const rttresponse: any[] = [];
    const rtttotal: any[] = [];
    const rttvalidate: any[] = [];
    const rttwriterequest: any[] = [];
    const status: any[] = [];
    const upArea: any[] = [];
    const downArea: any[] = [];
    const avgTcp: any[] = [];
    const areaTcp: any[] = [];
    rttexample.forEach((rtt: any) => {
      rttcontent.push(rtt.content);
      rttresponse.push(rtt.response);
      rtttotal.push(rtt.total);
      rttvalidate.push(rtt.validate);
      rttwriterequest.push(rtt.write_request);
      status.push({ x: rtt.status.x, y: rtt.status.y });
      upArea.push({ x: rtt.status.x, y: rtt.status.up });
      downArea.push({ x: rtt.status.x, y: rtt.status.down });
      avgTcp.push(rtt.avgTcp);
      areaTcp.push({ x: rtt.minTcp.x, y0: rtt.minTcp.y, y: rtt.maxTcp.y });
    });
    return (
      <div>
        <EuiTitle>
          <h2>{id}</h2>
        </EuiTitle>
        <EuiSpacer size="l" />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <span>Monitor:</span>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSuperSelect
              options={selectOptions}
              valueOfSelected={'http@https://www.google.com'}
              onChange={(e: any) => e}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiPanel>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup>
                <EuiFlexItem>Status&#58;</EuiFlexItem>
                <EuiFlexItem>
                  <EuiHealth color="success" style={{ lineHeight: 'inherit' }}>
                    Up
                  </EuiHealth>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>Last update: {moment([2018, 11, 11, 12, 35]).fromNow()}</EuiFlexItem>
            <EuiFlexItem>Host: www.google.com</EuiFlexItem>
            <EuiFlexItem>Port: 443</EuiFlexItem>
            <EuiFlexItem>RTT: 3156992&mu;s</EuiFlexItem>
            <EuiFlexItem>Scheme: HTTPS</EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h5>RTT Breakdown &mu;s</h5>
            </EuiTitle>
            <EuiPanel>
              <EuiSeriesChart
                stackBy="y"
                margins={{ left: 60, right: 20, top: 10, bottom: 40 }}
                ypadding={20}
                xType={EuiSeriesChartUtils.SCALE.TIME}
                width={550}
                height={200}
              >
                <EuiAreaSeries name="RTT Write Request" data={rttwriterequest} curve="curveBasis" />
                <EuiAreaSeries name="RTT Content" data={rttcontent} curve="curveBasis" />
                <EuiAreaSeries name="RTT Response" data={rttresponse} curve="curveBasis" />
                <EuiAreaSeries name="RTT Validate" data={rttvalidate} curve="curveBasis" />
                {/* <EuiAreaSeries name="RTT Total" data={rtttotal} curve="curveBasis" /> */}
              </EuiSeriesChart>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h5>Monitor Duration Breakdown &mu;s</h5>
            </EuiTitle>
            <EuiPanel>
              <EuiSeriesChart
                margins={{ left: 60, right: 20, top: 10, bottom: 40 }}
                yPadding={5}
                width={550}
                height={200}
                xType={EuiSeriesChartUtils.SCALE.TIME}
              >
                {/* <EuiLineSeries name="Max RTT" data={maxRtt} lineSize={3} />
                <EuiLineSeries name="Min RTT" data={minRtt} lineSize={3} /> */}
                <EuiAreaSeries name="Duration Range" data={areaRtt} curve="curveBasis" />
                <EuiLineSeries name="Mean Duration" data={avgRtt} lineSize={3} />
              </EuiSeriesChart>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h5>Ping Status</h5>
            </EuiTitle>
            <EuiPanel>
              <EuiSeriesChart
                margins={{ left: 60, right: 20, top: 10, bottom: 40 }}
                yPadding={5}
                width={550}
                height={200}
                xType={EuiSeriesChartUtils.SCALE.TIME}
              >
                <EuiAreaSeries name="Up Count" data={upArea} />
                <EuiAreaSeries name="Down Count" data={downArea} />
                <EuiLineSeries name="Pings" data={status} lineSize={3} />
              </EuiSeriesChart>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h5>TCP RTT &mu;s</h5>
            </EuiTitle>
            <EuiPanel>
              <EuiSeriesChart
                margins={{ left: 60, right: 20, top: 10, bottom: 40 }}
                yPadding={5}
                width={550}
                height={200}
                xType={EuiSeriesChartUtils.SCALE.TIME}
              >
                <EuiAreaSeries name="TCP RTT Range" data={areaTcp} curve="curveBasis" />
                <EuiLineSeries name="Average TCP RTT" data={avgRtt} lineSize={3} />
              </EuiSeriesChart>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>

        {/* <p>
          It will display information like the monitor&#8217;s performance over time, and other
          valuable information. In the next set of changes, this page will be replaced with more
          useful visualizations and data.
        </p> */}
      </div>
    );
  }
}

const exampleData = `[
  {
    "key": "tcp-tcp@localhost:9200",
    "timeseries": {
      "buckets": [
        {
          "key_as_string": "2018-12-10T14:00:00.000Z",
          "key": 1544450400000,
          "doc_count": 2305,
          "avg_duration": {
            "value": 1857.7045553145335
          },
          "min_duration": {
            "value": 947
          },
          "top_duration": {
            "value": 5789
          }
        },
        {
          "key_as_string": "2018-12-10T15:00:00.000Z",
          "key": 1544454000000,
          "doc_count": 3416,
          "avg_duration": {
            "value": 2367.6077283372365
          },
          "min_duration": {
            "value": 861
          },
          "top_duration": {
            "value": 642716
          }
        },
        {
          "key_as_string": "2018-12-10T16:00:00.000Z",
          "key": 1544457600000,
          "doc_count": 2775,
          "avg_duration": {
            "value": 1865.1264864864866
          },
          "min_duration": {
            "value": 658
          },
          "top_duration": {
            "value": 15358
          }
        },
        {
          "key_as_string": "2018-12-10T17:00:00.000Z",
          "key": 1544461200000,
          "doc_count": 3600,
          "avg_duration": {
            "value": 1845.263888888889
          },
          "min_duration": {
            "value": 901
          },
          "top_duration": {
            "value": 5803
          }
        },
        {
          "key_as_string": "2018-12-10T18:00:00.000Z",
          "key": 1544464800000,
          "doc_count": 3600,
          "avg_duration": {
            "value": 1835.5241666666666
          },
          "min_duration": {
            "value": 832
          },
          "top_duration": {
            "value": 8058
          }
        },
        {
          "key_as_string": "2018-12-10T19:00:00.000Z",
          "key": 1544468400000,
          "doc_count": 3600,
          "avg_duration": {
            "value": 1871.1069444444445
          },
          "min_duration": {
            "value": 738
          },
          "top_duration": {
            "value": 25781
          }
        },
        {
          "key_as_string": "2018-12-10T20:00:00.000Z",
          "key": 1544472000000,
          "doc_count": 3054,
          "avg_duration": {
            "value": 1891.854944335298
          },
          "min_duration": {
            "value": 640
          },
          "top_duration": {
            "value": 115836
          }
        },
        {
          "key_as_string": "2018-12-10T21:00:00.000Z",
          "key": 1544475600000,
          "doc_count": 3236,
          "avg_duration": {
            "value": 1984.933868974042
          },
          "min_duration": {
            "value": 519
          },
          "top_duration": {
            "value": 98710
          }
        },
        {
          "key_as_string": "2018-12-10T22:00:00.000Z",
          "key": 1544479200000,
          "doc_count": 3525,
          "avg_duration": {
            "value": 2043.7585815602838
          },
          "min_duration": {
            "value": 487
          },
          "top_duration": {
            "value": 165227
          }
        },
        {
          "key_as_string": "2018-12-10T23:00:00.000Z",
          "key": 1544482800000,
          "doc_count": 3600,
          "avg_duration": {
            "value": 1989.3616666666667
          },
          "min_duration": {
            "value": 715
          },
          "top_duration": {
            "value": 7878
          }
        },
        {
          "key_as_string": "2018-12-11T00:00:00.000Z",
          "key": 1544486400000,
          "doc_count": 2762,
          "avg_duration": {
            "value": 1759.1361332367849
          },
          "min_duration": {
            "value": 713
          },
          "top_duration": {
            "value": 9572
          }
        }
      ]
    },
    "series": [
      {
        "avg": {
          "x": 1544450400000,
          "y": 1857.7045553145335
        },
        "min": {
          "x": 1544450400000,
          "y": 947
        },
        "max": {
          "x": 1544450400000,
          "y": 5789
        }
      },
      {
        "avg": {
          "x": 1544454000000,
          "y": 2367.6077283372365
        },
        "min": {
          "x": 1544454000000,
          "y": 861
        },
        "max": {
          "x": 1544454000000,
          "y": 642716
        }
      },
      {
        "avg": {
          "x": 1544457600000,
          "y": 1865.1264864864866
        },
        "min": {
          "x": 1544457600000,
          "y": 658
        },
        "max": {
          "x": 1544457600000,
          "y": 15358
        }
      },
      {
        "avg": {
          "x": 1544461200000,
          "y": 1845.263888888889
        },
        "min": {
          "x": 1544461200000,
          "y": 901
        },
        "max": {
          "x": 1544461200000,
          "y": 5803
        }
      },
      {
        "avg": {
          "x": 1544464800000,
          "y": 1835.5241666666666
        },
        "min": {
          "x": 1544464800000,
          "y": 832
        },
        "max": {
          "x": 1544464800000,
          "y": 8058
        }
      },
      {
        "avg": {
          "x": 1544468400000,
          "y": 1871.1069444444445
        },
        "min": {
          "x": 1544468400000,
          "y": 738
        },
        "max": {
          "x": 1544468400000,
          "y": 25781
        }
      },
      {
        "avg": {
          "x": 1544472000000,
          "y": 1891.854944335298
        },
        "min": {
          "x": 1544472000000,
          "y": 640
        },
        "max": {
          "x": 1544472000000,
          "y": 115836
        }
      },
      {
        "avg": {
          "x": 1544475600000,
          "y": 1984.933868974042
        },
        "min": {
          "x": 1544475600000,
          "y": 519
        },
        "max": {
          "x": 1544475600000,
          "y": 98710
        }
      },
      {
        "avg": {
          "x": 1544479200000,
          "y": 2043.7585815602838
        },
        "min": {
          "x": 1544479200000,
          "y": 487
        },
        "max": {
          "x": 1544479200000,
          "y": 165227
        }
      },
      {
        "avg": {
          "x": 1544482800000,
          "y": 1989.3616666666667
        },
        "min": {
          "x": 1544482800000,
          "y": 715
        },
        "max": {
          "x": 1544482800000,
          "y": 7878
        }
      },
      {
        "avg": {
          "x": 1544486400000,
          "y": 1759.1361332367849
        },
        "min": {
          "x": 1544486400000,
          "y": 713
        },
        "max": {
          "x": 1544486400000,
          "y": 9572
        }
      }
    ]
  },
  {
    "key": "http@http://localhost:12349/",
    "timeseries": {
      "buckets": [
        {
          "key_as_string": "2018-12-10T14:00:00.000Z",
          "key": 1544450400000,
          "doc_count": 461,
          "avg_duration": {
            "value": 3175.989154013015
          },
          "min_duration": {
            "value": 1629
          },
          "top_duration": {
            "value": 5860
          }
        },
        {
          "key_as_string": "2018-12-10T15:00:00.000Z",
          "key": 1544454000000,
          "doc_count": 684,
          "avg_duration": {
            "value": 4112.953216374269
          },
          "min_duration": {
            "value": 1451
          },
          "top_duration": {
            "value": 485872
          }
        },
        {
          "key_as_string": "2018-12-10T16:00:00.000Z",
          "key": 1544457600000,
          "doc_count": 555,
          "avg_duration": {
            "value": 3204.908108108108
          },
          "min_duration": {
            "value": 1597
          },
          "top_duration": {
            "value": 9035
          }
        },
        {
          "key_as_string": "2018-12-10T17:00:00.000Z",
          "key": 1544461200000,
          "doc_count": 720,
          "avg_duration": {
            "value": 3150.491666666667
          },
          "min_duration": {
            "value": 1443
          },
          "top_duration": {
            "value": 5098
          }
        },
        {
          "key_as_string": "2018-12-10T18:00:00.000Z",
          "key": 1544464800000,
          "doc_count": 720,
          "avg_duration": {
            "value": 3115.2208333333333
          },
          "min_duration": {
            "value": 1440
          },
          "top_duration": {
            "value": 8107
          }
        },
        {
          "key_as_string": "2018-12-10T19:00:00.000Z",
          "key": 1544468400000,
          "doc_count": 720,
          "avg_duration": {
            "value": 3178.509722222222
          },
          "min_duration": {
            "value": 1264
          },
          "top_duration": {
            "value": 26189
          }
        },
        {
          "key_as_string": "2018-12-10T20:00:00.000Z",
          "key": 1544472000000,
          "doc_count": 610,
          "avg_duration": {
            "value": 3327.95737704918
          },
          "min_duration": {
            "value": 1467
          },
          "top_duration": {
            "value": 115691
          }
        },
        {
          "key_as_string": "2018-12-10T21:00:00.000Z",
          "key": 1544475600000,
          "doc_count": 653,
          "avg_duration": {
            "value": 3370.649310872894
          },
          "min_duration": {
            "value": 641
          },
          "top_duration": {
            "value": 98745
          }
        },
        {
          "key_as_string": "2018-12-10T22:00:00.000Z",
          "key": 1544479200000,
          "doc_count": 707,
          "avg_duration": {
            "value": 3593.086280056577
          },
          "min_duration": {
            "value": 497
          },
          "top_duration": {
            "value": 165760
          }
        },
        {
          "key_as_string": "2018-12-10T23:00:00.000Z",
          "key": 1544482800000,
          "doc_count": 720,
          "avg_duration": {
            "value": 3166.25
          },
          "min_duration": {
            "value": 1315
          },
          "top_duration": {
            "value": 5524
          }
        },
        {
          "key_as_string": "2018-12-11T00:00:00.000Z",
          "key": 1544486400000,
          "doc_count": 552,
          "avg_duration": {
            "value": 2843.557971014493
          },
          "min_duration": {
            "value": 975
          },
          "top_duration": {
            "value": 10937
          }
        }
      ]
    },
    "series": [
      {
        "avg": {
          "x": 1544450400000,
          "y": 3175.989154013015
        },
        "min": {
          "x": 1544450400000,
          "y": 1629
        },
        "max": {
          "x": 1544450400000,
          "y": 5860
        }
      },
      {
        "avg": {
          "x": 1544454000000,
          "y": 4112.953216374269
        },
        "min": {
          "x": 1544454000000,
          "y": 1451
        },
        "max": {
          "x": 1544454000000,
          "y": 485872
        }
      },
      {
        "avg": {
          "x": 1544457600000,
          "y": 3204.908108108108
        },
        "min": {
          "x": 1544457600000,
          "y": 1597
        },
        "max": {
          "x": 1544457600000,
          "y": 9035
        }
      },
      {
        "avg": {
          "x": 1544461200000,
          "y": 3150.491666666667
        },
        "min": {
          "x": 1544461200000,
          "y": 1443
        },
        "max": {
          "x": 1544461200000,
          "y": 5098
        }
      },
      {
        "avg": {
          "x": 1544464800000,
          "y": 3115.2208333333333
        },
        "min": {
          "x": 1544464800000,
          "y": 1440
        },
        "max": {
          "x": 1544464800000,
          "y": 8107
        }
      },
      {
        "avg": {
          "x": 1544468400000,
          "y": 3178.509722222222
        },
        "min": {
          "x": 1544468400000,
          "y": 1264
        },
        "max": {
          "x": 1544468400000,
          "y": 26189
        }
      },
      {
        "avg": {
          "x": 1544472000000,
          "y": 3327.95737704918
        },
        "min": {
          "x": 1544472000000,
          "y": 1467
        },
        "max": {
          "x": 1544472000000,
          "y": 115691
        }
      },
      {
        "avg": {
          "x": 1544475600000,
          "y": 3370.649310872894
        },
        "min": {
          "x": 1544475600000,
          "y": 641
        },
        "max": {
          "x": 1544475600000,
          "y": 98745
        }
      },
      {
        "avg": {
          "x": 1544479200000,
          "y": 3593.086280056577
        },
        "min": {
          "x": 1544479200000,
          "y": 497
        },
        "max": {
          "x": 1544479200000,
          "y": 165760
        }
      },
      {
        "avg": {
          "x": 1544482800000,
          "y": 3166.25
        },
        "min": {
          "x": 1544482800000,
          "y": 1315
        },
        "max": {
          "x": 1544482800000,
          "y": 5524
        }
      },
      {
        "avg": {
          "x": 1544486400000,
          "y": 2843.557971014493
        },
        "min": {
          "x": 1544486400000,
          "y": 975
        },
        "max": {
          "x": 1544486400000,
          "y": 10937
        }
      }
    ]
  },
  {
    "key": "http@https://www.google.com/",
    "timeseries": {
      "buckets": [
        {
          "key_as_string": "2018-12-10T14:00:00.000Z",
          "key": 1544450400000,
          "doc_count": 461,
          "avg_duration": {
            "value": 1139170.7093275487
          },
          "min_duration": {
            "value": 83186
          },
          "top_duration": {
            "value": 4033677
          }
        },
        {
          "key_as_string": "2018-12-10T15:00:00.000Z",
          "key": 1544454000000,
          "doc_count": 684,
          "avg_duration": {
            "value": 1007130.4415204679
          },
          "min_duration": {
            "value": 5154
          },
          "top_duration": {
            "value": 3548609
          }
        },
        {
          "key_as_string": "2018-12-10T16:00:00.000Z",
          "key": 1544457600000,
          "doc_count": 555,
          "avg_duration": {
            "value": 200605.4072072072
          },
          "min_duration": {
            "value": 85092
          },
          "top_duration": {
            "value": 3169155
          }
        },
        {
          "key_as_string": "2018-12-10T17:00:00.000Z",
          "key": 1544461200000,
          "doc_count": 720,
          "avg_duration": {
            "value": 206115.03055555557
          },
          "min_duration": {
            "value": 85056
          },
          "top_duration": {
            "value": 846428
          }
        },
        {
          "key_as_string": "2018-12-10T18:00:00.000Z",
          "key": 1544464800000,
          "doc_count": 720,
          "avg_duration": {
            "value": 188687.67777777778
          },
          "min_duration": {
            "value": 84631
          },
          "top_duration": {
            "value": 602282
          }
        },
        {
          "key_as_string": "2018-12-10T19:00:00.000Z",
          "key": 1544468400000,
          "doc_count": 720,
          "avg_duration": {
            "value": 181886.24305555556
          },
          "min_duration": {
            "value": 82973
          },
          "top_duration": {
            "value": 665524
          }
        },
        {
          "key_as_string": "2018-12-10T20:00:00.000Z",
          "key": 1544472000000,
          "doc_count": 609,
          "avg_duration": {
            "value": 195215.3776683087
          },
          "min_duration": {
            "value": 80766
          },
          "top_duration": {
            "value": 2008102
          }
        },
        {
          "key_as_string": "2018-12-10T21:00:00.000Z",
          "key": 1544475600000,
          "doc_count": 653,
          "avg_duration": {
            "value": 165506.76110260337
          },
          "min_duration": {
            "value": 769
          },
          "top_duration": {
            "value": 506315
          }
        },
        {
          "key_as_string": "2018-12-10T22:00:00.000Z",
          "key": 1544479200000,
          "doc_count": 708,
          "avg_duration": {
            "value": 168464.56497175142
          },
          "min_duration": {
            "value": 503
          },
          "top_duration": {
            "value": 519527
          }
        },
        {
          "key_as_string": "2018-12-10T23:00:00.000Z",
          "key": 1544482800000,
          "doc_count": 720,
          "avg_duration": {
            "value": 116699.28611111111
          },
          "min_duration": {
            "value": 83388
          },
          "top_duration": {
            "value": 306888
          }
        },
        {
          "key_as_string": "2018-12-11T00:00:00.000Z",
          "key": 1544486400000,
          "doc_count": 552,
          "avg_duration": {
            "value": 153291.7572463768
          },
          "min_duration": {
            "value": 83490
          },
          "top_duration": {
            "value": 2648515
          }
        }
      ]
    },
    "series": [
      {
        "avg": {
          "x": 1544450400000,
          "y": 1139170.7093275487
        },
        "min": {
          "x": 1544450400000,
          "y": 83186
        },
        "max": {
          "x": 1544450400000,
          "y": 4033677
        }
      },
      {
        "avg": {
          "x": 1544454000000,
          "y": 1007130.4415204679
        },
        "min": {
          "x": 1544454000000,
          "y": 5154
        },
        "max": {
          "x": 1544454000000,
          "y": 3548609
        }
      },
      {
        "avg": {
          "x": 1544457600000,
          "y": 200605.4072072072
        },
        "min": {
          "x": 1544457600000,
          "y": 85092
        },
        "max": {
          "x": 1544457600000,
          "y": 3169155
        }
      },
      {
        "avg": {
          "x": 1544461200000,
          "y": 206115.03055555557
        },
        "min": {
          "x": 1544461200000,
          "y": 85056
        },
        "max": {
          "x": 1544461200000,
          "y": 846428
        }
      },
      {
        "avg": {
          "x": 1544464800000,
          "y": 188687.67777777778
        },
        "min": {
          "x": 1544464800000,
          "y": 84631
        },
        "max": {
          "x": 1544464800000,
          "y": 602282
        }
      },
      {
        "avg": {
          "x": 1544468400000,
          "y": 181886.24305555556
        },
        "min": {
          "x": 1544468400000,
          "y": 82973
        },
        "max": {
          "x": 1544468400000,
          "y": 665524
        }
      },
      {
        "avg": {
          "x": 1544472000000,
          "y": 195215.3776683087
        },
        "min": {
          "x": 1544472000000,
          "y": 80766
        },
        "max": {
          "x": 1544472000000,
          "y": 2008102
        }
      },
      {
        "avg": {
          "x": 1544475600000,
          "y": 165506.76110260337
        },
        "min": {
          "x": 1544475600000,
          "y": 769
        },
        "max": {
          "x": 1544475600000,
          "y": 506315
        }
      },
      {
        "avg": {
          "x": 1544479200000,
          "y": 168464.56497175142
        },
        "min": {
          "x": 1544479200000,
          "y": 503
        },
        "max": {
          "x": 1544479200000,
          "y": 519527
        }
      },
      {
        "avg": {
          "x": 1544482800000,
          "y": 116699.28611111111
        },
        "min": {
          "x": 1544482800000,
          "y": 83388
        },
        "max": {
          "x": 1544482800000,
          "y": 306888
        }
      },
      {
        "avg": {
          "x": 1544486400000,
          "y": 153291.7572463768
        },
        "min": {
          "x": 1544486400000,
          "y": 83490
        },
        "max": {
          "x": 1544486400000,
          "y": 2648515
        }
      }
    ]
  },
  {
    "key": "http@http://www.jerkami.com",
    "timeseries": {
      "buckets": [
        {
          "key_as_string": "2018-12-10T14:00:00.000Z",
          "key": 1544450400000,
          "doc_count": 459,
          "avg_duration": {
            "value": 623186.302832244
          },
          "min_duration": {
            "value": 32523
          },
          "top_duration": {
            "value": 6465077
          }
        },
        {
          "key_as_string": "2018-12-10T15:00:00.000Z",
          "key": 1544454000000,
          "doc_count": 684,
          "avg_duration": {
            "value": 551129.8947368421
          },
          "min_duration": {
            "value": 3066
          },
          "top_duration": {
            "value": 3592451
          }
        },
        {
          "key_as_string": "2018-12-10T16:00:00.000Z",
          "key": 1544457600000,
          "doc_count": 555,
          "avg_duration": {
            "value": 169416.1009009009
          },
          "min_duration": {
            "value": 33321
          },
          "top_duration": {
            "value": 646507
          }
        },
        {
          "key_as_string": "2018-12-10T17:00:00.000Z",
          "key": 1544461200000,
          "doc_count": 720,
          "avg_duration": {
            "value": 131183.14027777777
          },
          "min_duration": {
            "value": 33599
          },
          "top_duration": {
            "value": 505635
          }
        },
        {
          "key_as_string": "2018-12-10T18:00:00.000Z",
          "key": 1544464800000,
          "doc_count": 720,
          "avg_duration": {
            "value": 150407.70694444445
          },
          "min_duration": {
            "value": 33594
          },
          "top_duration": {
            "value": 1292451
          }
        },
        {
          "key_as_string": "2018-12-10T19:00:00.000Z",
          "key": 1544468400000,
          "doc_count": 720,
          "avg_duration": {
            "value": 112077.39166666666
          },
          "min_duration": {
            "value": 34433
          },
          "top_duration": {
            "value": 577473
          }
        },
        {
          "key_as_string": "2018-12-10T20:00:00.000Z",
          "key": 1544472000000,
          "doc_count": 610,
          "avg_duration": {
            "value": 131068.1213114754
          },
          "min_duration": {
            "value": 32664
          },
          "top_duration": {
            "value": 1099516
          }
        },
        {
          "key_as_string": "2018-12-10T21:00:00.000Z",
          "key": 1544475600000,
          "doc_count": 653,
          "avg_duration": {
            "value": 141294.55895865237
          },
          "min_duration": {
            "value": 1052
          },
          "top_duration": {
            "value": 500568
          }
        },
        {
          "key_as_string": "2018-12-10T22:00:00.000Z",
          "key": 1544479200000,
          "doc_count": 707,
          "avg_duration": {
            "value": 132870.1117397454
          },
          "min_duration": {
            "value": 1144
          },
          "top_duration": {
            "value": 1021738
          }
        },
        {
          "key_as_string": "2018-12-10T23:00:00.000Z",
          "key": 1544482800000,
          "doc_count": 720,
          "avg_duration": {
            "value": 94877.55972222223
          },
          "min_duration": {
            "value": 33543
          },
          "top_duration": {
            "value": 828831
          }
        },
        {
          "key_as_string": "2018-12-11T00:00:00.000Z",
          "key": 1544486400000,
          "doc_count": 552,
          "avg_duration": {
            "value": 168574.8677536232
          },
          "min_duration": {
            "value": 34592
          },
          "top_duration": {
            "value": 682110
          }
        }
      ]
    },
    "series": [
      {
        "avg": {
          "x": 1544450400000,
          "y": 623186.302832244
        },
        "min": {
          "x": 1544450400000,
          "y": 32523
        },
        "max": {
          "x": 1544450400000,
          "y": 6465077
        }
      },
      {
        "avg": {
          "x": 1544454000000,
          "y": 551129.8947368421
        },
        "min": {
          "x": 1544454000000,
          "y": 3066
        },
        "max": {
          "x": 1544454000000,
          "y": 3592451
        }
      },
      {
        "avg": {
          "x": 1544457600000,
          "y": 169416.1009009009
        },
        "min": {
          "x": 1544457600000,
          "y": 33321
        },
        "max": {
          "x": 1544457600000,
          "y": 646507
        }
      },
      {
        "avg": {
          "x": 1544461200000,
          "y": 131183.14027777777
        },
        "min": {
          "x": 1544461200000,
          "y": 33599
        },
        "max": {
          "x": 1544461200000,
          "y": 505635
        }
      },
      {
        "avg": {
          "x": 1544464800000,
          "y": 150407.70694444445
        },
        "min": {
          "x": 1544464800000,
          "y": 33594
        },
        "max": {
          "x": 1544464800000,
          "y": 1292451
        }
      },
      {
        "avg": {
          "x": 1544468400000,
          "y": 112077.39166666666
        },
        "min": {
          "x": 1544468400000,
          "y": 34433
        },
        "max": {
          "x": 1544468400000,
          "y": 577473
        }
      },
      {
        "avg": {
          "x": 1544472000000,
          "y": 131068.1213114754
        },
        "min": {
          "x": 1544472000000,
          "y": 32664
        },
        "max": {
          "x": 1544472000000,
          "y": 1099516
        }
      },
      {
        "avg": {
          "x": 1544475600000,
          "y": 141294.55895865237
        },
        "min": {
          "x": 1544475600000,
          "y": 1052
        },
        "max": {
          "x": 1544475600000,
          "y": 500568
        }
      },
      {
        "avg": {
          "x": 1544479200000,
          "y": 132870.1117397454
        },
        "min": {
          "x": 1544479200000,
          "y": 1144
        },
        "max": {
          "x": 1544479200000,
          "y": 1021738
        }
      },
      {
        "avg": {
          "x": 1544482800000,
          "y": 94877.55972222223
        },
        "min": {
          "x": 1544482800000,
          "y": 33543
        },
        "max": {
          "x": 1544482800000,
          "y": 828831
        }
      },
      {
        "avg": {
          "x": 1544486400000,
          "y": 168574.8677536232
        },
        "min": {
          "x": 1544486400000,
          "y": 34592
        },
        "max": {
          "x": 1544486400000,
          "y": 682110
        }
      }
    ]
  },
  {
    "key": "http@https://www.github.com/",
    "timeseries": {
      "buckets": [
        {
          "key_as_string": "2018-12-10T14:00:00.000Z",
          "key": 1544450400000,
          "doc_count": 460,
          "avg_duration": {
            "value": 1423094.1173913043
          },
          "min_duration": {
            "value": 160667
          },
          "top_duration": {
            "value": 7149436
          }
        },
        {
          "key_as_string": "2018-12-10T15:00:00.000Z",
          "key": 1544454000000,
          "doc_count": 679,
          "avg_duration": {
            "value": 1400098.7452135494
          },
          "min_duration": {
            "value": 5201
          },
          "top_duration": {
            "value": 6659617
          }
        },
        {
          "key_as_string": "2018-12-10T16:00:00.000Z",
          "key": 1544457600000,
          "doc_count": 555,
          "avg_duration": {
            "value": 524537.0756756756
          },
          "min_duration": {
            "value": 167866
          },
          "top_duration": {
            "value": 4289002
          }
        },
        {
          "key_as_string": "2018-12-10T17:00:00.000Z",
          "key": 1544461200000,
          "doc_count": 720,
          "avg_duration": {
            "value": 472727.0625
          },
          "min_duration": {
            "value": 163996
          },
          "top_duration": {
            "value": 3032322
          }
        },
        {
          "key_as_string": "2018-12-10T18:00:00.000Z",
          "key": 1544464800000,
          "doc_count": 720,
          "avg_duration": {
            "value": 470918.9666666667
          },
          "min_duration": {
            "value": 169101
          },
          "top_duration": {
            "value": 3242973
          }
        },
        {
          "key_as_string": "2018-12-10T19:00:00.000Z",
          "key": 1544468400000,
          "doc_count": 719,
          "avg_duration": {
            "value": 444308.6912378303
          },
          "min_duration": {
            "value": 161007
          },
          "top_duration": {
            "value": 5078838
          }
        },
        {
          "key_as_string": "2018-12-10T20:00:00.000Z",
          "key": 1544472000000,
          "doc_count": 609,
          "avg_duration": {
            "value": 418928.62561576354
          },
          "min_duration": {
            "value": 116283
          },
          "top_duration": {
            "value": 1993500
          }
        },
        {
          "key_as_string": "2018-12-10T21:00:00.000Z",
          "key": 1544475600000,
          "doc_count": 647,
          "avg_duration": {
            "value": 407832.06955177744
          },
          "min_duration": {
            "value": 166646
          },
          "top_duration": {
            "value": 2970006
          }
        },
        {
          "key_as_string": "2018-12-10T22:00:00.000Z",
          "key": 1544479200000,
          "doc_count": 707,
          "avg_duration": {
            "value": 413101.9688826025
          },
          "min_duration": {
            "value": 873
          },
          "top_duration": {
            "value": 2908602
          }
        },
        {
          "key_as_string": "2018-12-10T23:00:00.000Z",
          "key": 1544482800000,
          "doc_count": 720,
          "avg_duration": {
            "value": 351838.34027777775
          },
          "min_duration": {
            "value": 161158
          },
          "top_duration": {
            "value": 2368107
          }
        },
        {
          "key_as_string": "2018-12-11T00:00:00.000Z",
          "key": 1544486400000,
          "doc_count": 552,
          "avg_duration": {
            "value": 411617.54347826086
          },
          "min_duration": {
            "value": 167067
          },
          "top_duration": {
            "value": 2836875
          }
        }
      ]
    },
    "series": [
      {
        "avg": {
          "x": 1544450400000,
          "y": 1423094.1173913043
        },
        "min": {
          "x": 1544450400000,
          "y": 160667
        },
        "max": {
          "x": 1544450400000,
          "y": 7149436
        }
      },
      {
        "avg": {
          "x": 1544454000000,
          "y": 1400098.7452135494
        },
        "min": {
          "x": 1544454000000,
          "y": 5201
        },
        "max": {
          "x": 1544454000000,
          "y": 6659617
        }
      },
      {
        "avg": {
          "x": 1544457600000,
          "y": 524537.0756756756
        },
        "min": {
          "x": 1544457600000,
          "y": 167866
        },
        "max": {
          "x": 1544457600000,
          "y": 4289002
        }
      },
      {
        "avg": {
          "x": 1544461200000,
          "y": 472727.0625
        },
        "min": {
          "x": 1544461200000,
          "y": 163996
        },
        "max": {
          "x": 1544461200000,
          "y": 3032322
        }
      },
      {
        "avg": {
          "x": 1544464800000,
          "y": 470918.9666666667
        },
        "min": {
          "x": 1544464800000,
          "y": 169101
        },
        "max": {
          "x": 1544464800000,
          "y": 3242973
        }
      },
      {
        "avg": {
          "x": 1544468400000,
          "y": 444308.6912378303
        },
        "min": {
          "x": 1544468400000,
          "y": 161007
        },
        "max": {
          "x": 1544468400000,
          "y": 5078838
        }
      },
      {
        "avg": {
          "x": 1544472000000,
          "y": 418928.62561576354
        },
        "min": {
          "x": 1544472000000,
          "y": 116283
        },
        "max": {
          "x": 1544472000000,
          "y": 1993500
        }
      },
      {
        "avg": {
          "x": 1544475600000,
          "y": 407832.06955177744
        },
        "min": {
          "x": 1544475600000,
          "y": 166646
        },
        "max": {
          "x": 1544475600000,
          "y": 2970006
        }
      },
      {
        "avg": {
          "x": 1544479200000,
          "y": 413101.9688826025
        },
        "min": {
          "x": 1544479200000,
          "y": 873
        },
        "max": {
          "x": 1544479200000,
          "y": 2908602
        }
      },
      {
        "avg": {
          "x": 1544482800000,
          "y": 351838.34027777775
        },
        "min": {
          "x": 1544482800000,
          "y": 161158
        },
        "max": {
          "x": 1544482800000,
          "y": 2368107
        }
      },
      {
        "avg": {
          "x": 1544486400000,
          "y": 411617.54347826086
        },
        "min": {
          "x": 1544486400000,
          "y": 167067
        },
        "max": {
          "x": 1544486400000,
          "y": 2836875
        }
      }
    ]
  }
]`;

const rttsampledata = `[
  {
    "content": {
      "x": 1544450400000,
      "y": 168864
    },
    "response": {
      "x": 1544450400000,
      "y": 1031824
    },
    "total": {
      "x": 1544450400000,
      "y": 4030206
    },
    "validate": {
      "x": 1544450400000,
      "y": 1031952
    },
    "write_request": {
      "x": 1544450400000,
      "y": 321
    },
    "status": {
      "x": 1544450400000,
      "y": 461,
      "up": 461,
      "down": 0
    },
    "avgTcp": {
      "x": 1544450400000,
      "y": 288907.16919739696
    },
    "maxTcp": {
      "x": 1544450400000,
      "y": 2282651
    },
    "minTcp": {
      "x": 1544450400000,
      "y": 7793
    }
  },
  {
    "content": {
      "x": 1544454000000,
      "y": 159154
    },
    "response": {
      "x": 1544454000000,
      "y": 1034973
    },
    "total": {
      "x": 1544454000000,
      "y": 3545330
    },
    "validate": {
      "x": 1544454000000,
      "y": 1035136
    },
    "write_request": {
      "x": 1544454000000,
      "y": 222
    },
    "status": {
      "x": 1544454000000,
      "y": 684,
      "up": 679,
      "down": 5
    },
    "avgTcp": {
      "x": 1544454000000,
      "y": 265148.65684830636
    },
    "maxTcp": {
      "x": 1544454000000,
      "y": 2279374
    },
    "minTcp": {
      "x": 1544454000000,
      "y": 7715
    }
  },
  {
    "content": {
      "x": 1544457600000,
      "y": 22692
    },
    "response": {
      "x": 1544457600000,
      "y": 323618
    },
    "total": {
      "x": 1544457600000,
      "y": 3156992
    },
    "validate": {
      "x": 1544457600000,
      "y": 323672
    },
    "write_request": {
      "x": 1544457600000,
      "y": 597
    },
    "status": {
      "x": 1544457600000,
      "y": 555,
      "up": 555,
      "down": 0
    },
    "avgTcp": {
      "x": 1544457600000,
      "y": 33999.0990990991
    },
    "maxTcp": {
      "x": 1544457600000,
      "y": 156233
    },
    "minTcp": {
      "x": 1544457600000,
      "y": 7964
    }
  },
  {
    "content": {
      "x": 1544461200000,
      "y": 138208
    },
    "response": {
      "x": 1544461200000,
      "y": 324235
    },
    "total": {
      "x": 1544461200000,
      "y": 843412
    },
    "validate": {
      "x": 1544461200000,
      "y": 324306
    },
    "write_request": {
      "x": 1544461200000,
      "y": 358
    },
    "status": {
      "x": 1544461200000,
      "y": 720,
      "up": 720,
      "down": 0
    },
    "avgTcp": {
      "x": 1544461200000,
      "y": 38845.32638888889
    },
    "maxTcp": {
      "x": 1544461200000,
      "y": 338356
    },
    "minTcp": {
      "x": 1544461200000,
      "y": 7934
    }
  },
  {
    "content": {
      "x": 1544464800000,
      "y": 218408
    },
    "response": {
      "x": 1544464800000,
      "y": 327536
    },
    "total": {
      "x": 1544464800000,
      "y": 598826
    },
    "validate": {
      "x": 1544464800000,
      "y": 332208
    },
    "write_request": {
      "x": 1544464800000,
      "y": 420
    },
    "status": {
      "x": 1544464800000,
      "y": 720,
      "up": 720,
      "down": 0
    },
    "avgTcp": {
      "x": 1544464800000,
      "y": 34281.26111111111
    },
    "maxTcp": {
      "x": 1544464800000,
      "y": 222616
    },
    "minTcp": {
      "x": 1544464800000,
      "y": 8006
    }
  },
  {
    "content": {
      "x": 1544468400000,
      "y": 221572
    },
    "response": {
      "x": 1544468400000,
      "y": 324676
    },
    "total": {
      "x": 1544468400000,
      "y": 663482
    },
    "validate": {
      "x": 1544468400000,
      "y": 324756
    },
    "write_request": {
      "x": 1544468400000,
      "y": 401
    },
    "status": {
      "x": 1544468400000,
      "y": 720,
      "up": 720,
      "down": 0
    },
    "avgTcp": {
      "x": 1544468400000,
      "y": 32288.8
    },
    "maxTcp": {
      "x": 1544468400000,
      "y": 227258
    },
    "minTcp": {
      "x": 1544468400000,
      "y": 8383
    }
  },
  {
    "content": {
      "x": 1544472000000,
      "y": 219893
    },
    "response": {
      "x": 1544472000000,
      "y": 306136
    },
    "total": {
      "x": 1544472000000,
      "y": 636244
    },
    "validate": {
      "x": 1544472000000,
      "y": 325060
    },
    "write_request": {
      "x": 1544472000000,
      "y": 300
    },
    "status": {
      "x": 1544472000000,
      "y": 609,
      "up": 608,
      "down": 1
    },
    "avgTcp": {
      "x": 1544472000000,
      "y": 39077.97368421053
    },
    "maxTcp": {
      "x": 1544472000000,
      "y": 277207
    },
    "minTcp": {
      "x": 1544472000000,
      "y": 7522
    }
  },
  {
    "content": {
      "x": 1544475600000,
      "y": 176048
    },
    "response": {
      "x": 1544475600000,
      "y": 320658
    },
    "total": {
      "x": 1544475600000,
      "y": 503407
    },
    "validate": {
      "x": 1544475600000,
      "y": 320771
    },
    "write_request": {
      "x": 1544475600000,
      "y": 479
    },
    "status": {
      "x": 1544475600000,
      "y": 653,
      "up": 646,
      "down": 7
    },
    "avgTcp": {
      "x": 1544475600000,
      "y": 31806.224458204335
    },
    "maxTcp": {
      "x": 1544475600000,
      "y": 192840
    },
    "minTcp": {
      "x": 1544475600000,
      "y": 7918
    }
  },
  {
    "content": {
      "x": 1544479200000,
      "y": 185582
    },
    "response": {
      "x": 1544479200000,
      "y": 321140
    },
    "total": {
      "x": 1544479200000,
      "y": 516736
    },
    "validate": {
      "x": 1544479200000,
      "y": 321231
    },
    "write_request": {
      "x": 1544479200000,
      "y": 5972
    },
    "status": {
      "x": 1544479200000,
      "y": 708,
      "up": 702,
      "down": 6
    },
    "avgTcp": {
      "x": 1544479200000,
      "y": 31433.801994301994
    },
    "maxTcp": {
      "x": 1544479200000,
      "y": 160348
    },
    "minTcp": {
      "x": 1544479200000,
      "y": 7765
    }
  },
  {
    "content": {
      "x": 1544482800000,
      "y": 8969
    },
    "response": {
      "x": 1544482800000,
      "y": 232644
    },
    "total": {
      "x": 1544482800000,
      "y": 303331
    },
    "validate": {
      "x": 1544482800000,
      "y": 235485
    },
    "write_request": {
      "x": 1544482800000,
      "y": 245
    },
    "status": {
      "x": 1544482800000,
      "y": 720,
      "up": 720,
      "down": 0
    },
    "avgTcp": {
      "x": 1544482800000,
      "y": 15216.52638888889
    },
    "maxTcp": {
      "x": 1544482800000,
      "y": 25641
    },
    "minTcp": {
      "x": 1544482800000,
      "y": 7833
    }
  },
  {
    "content": {
      "x": 1544486400000,
      "y": 1041616
    },
    "response": {
      "x": 1544486400000,
      "y": 358415
    },
    "total": {
      "x": 1544486400000,
      "y": 2647315
    },
    "validate": {
      "x": 1544486400000,
      "y": 1377852
    },
    "write_request": {
      "x": 1544486400000,
      "y": 189
    },
    "status": {
      "x": 1544486400000,
      "y": 552,
      "up": 552,
      "down": 0
    },
    "avgTcp": {
      "x": 1544486400000,
      "y": 23779.579710144928
    },
    "maxTcp": {
      "x": 1544486400000,
      "y": 337363
    },
    "minTcp": {
      "x": 1544486400000,
      "y": 8050
    }
  }
]`;
