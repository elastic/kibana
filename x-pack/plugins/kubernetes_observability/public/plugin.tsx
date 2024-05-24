import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { HttpStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  EuiTab,
  EuiTabs,
  EuiLink,
  EuiBasicTable,
  EuiTableSortingType,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';

const ContentWrapper = styled(EuiFlexGroup)`
  height: 100%;
  margin: 0 auto;
`;


export class kubernetesObservability implements Plugin {
  public setup(core: CoreSetup) {
    // Register an application into the side navigation menu
    // const results =  core.http.get('/kubernetes/nodes/memory');
    const publicK8sObservabilityClient = new PublicKubernetesObservabilityClient(core.http);
    core.application.register({
      id: 'kubernetesObservability',
      title: i18n.translate('xpack.fleet.K8sObservabilityAppTitle', {
        defaultMessage: 'Kubernetes Observability',
      }),
      order: 9019,
      euiIconType: 'logoElastic',
      async mount({ element }: AppMountParameters) {
        ReactDOM.render([<div><EuiTitle size="l">
                            <h2 id="KubernetesObservabilityTitle">
                                <FormattedMessage
                                  id="xpack.fleet.kubernetesObservability"
                                  defaultMessage="Kubernetes Observability"
                                />
                            </h2>
                          </EuiTitle>
                          <EuiSpacer size="l" />
                          <EuiSpacer size="l" />
                          </div>,
                        <KubernetesObservabilityComp client={publicK8sObservabilityClient} />],
                        element
        )
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });
  }
  public start(core: CoreStart) {
    console.log("kubernetesObservability public started");
    const publicK8sObservabilityClient = new PublicKubernetesObservabilityClient(core.http);
    // const results = await core.http.get('/kubernetes/nodes/memory');
    return {};
  }
  public stop() {}
}


export class PublicKubernetesObservabilityClient {
    constructor(private readonly http: HttpStart) {}
  
    async getNodesMemory() {
      console.log("CALLED TO GET NODES MEM")
      const results = await this.http.get('/api/kubernetes/nodes/memory', {version: '1',});
      console.log(results);
      return results;
    }

    async getNodesCpu() {
      console.log("CALLED TO GET NODES CPU")
      const results = await this.http.get('/api/kubernetes/nodes/cpu', {version: '1',});
      console.log(results);
      return results;
    }

    async getPodsStatus() {
      console.log("CALLED TO GET PODS STATUS")
      const results = await this.http.get('/api/kubernetes/pods/status', {version: '1',});
      console.log(results);
      return results;
    }

    async getDeploymentsStatus() {
      console.log("CALLED TO GET DEPLOYMENTS STATUS")
      const results = await this.http.get('/api/kubernetes/deployments/status', {version: '1',});
      console.log(results);
      return results;
    }

    async getDaemonsetsStatus() {
      console.log("CALLED TO GET DAEMONSETS STATUS")
      const results = await this.http.get('/api/kubernetes/daemonsets/status', {version: '1',});
      console.log(results);
      return results;
    }
}

const  KubernetesObservabilityComp = ({
  client,
}: {
  client?: any;
}) => {

  const [nodesMem, setNodesMem] = useState([]);
  const [nodeMemtime, setNodeMemTime] = useState([]);
  const [nodeCpuTime, setNodeCpuTime] = useState([]);
  const [nodesCpu, setNodesCpu] = useState([]);
  const [podsStatusTime, setPodsStatusTime] = useState([]);
  const [podsStatus, setPodsStatus] = useState([]);
  const [deploysStatusTime, setDeploysStatusTime] = useState([]);
  const [deploysStatus, setDeploysStatus] = useState([]);
  const [daemonsStatusTime, setDaemonsStatusTime] = useState([]);
  const [daemonsStatus, setDaemonsStatus] = useState([]);
  console.log("called");
  console.log(client);
  
  useEffect(() => {
    client.getNodesMemory().then(data => {
      console.log(data);
      setNodeMemTime(data.time);
      const nodesArray = data.nodes;
      const keys = ['name', 'memory_utilization', 'message', 'alarm'];

      const nodes = nodesArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
      setNodesMem(nodes);
      })
      .catch(error => {
          console.log(error)
      });
  }, [client]); // *** Note the dependency
  
  useEffect(() => {
    client.getNodesCpu().then(data => {
      console.log(data);
      setNodeCpuTime(data.time);
      const nodesArray = data.nodes;
      const keys = ['name', 'cpu_utilization', 'message', 'alarm'];

      const nodes = nodesArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
      setNodesCpu(nodes);
      })
      .catch(error => {
          console.log(error)
      });
  }, [client]); // *** Note the dependency

  useEffect(() => {
    client.getDeploymentsStatus().then(data => {
      console.log(data);
      setDeploysStatusTime(data.time);
      const deployArray = data.deployments;
      const keys = ['name', 'namespace', 'status', 'message', 'reason', 'events'];
      deployArray.map((deploy: any) => {
        const reason = deploy.reason;
        if (reason === '') {
          deploy["status"] = "OK"
        } else {
          deploy["status"] = "Warning"
        }
      });
      const deploys = deployArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
      setDeploysStatus(deploys);
      })
      .catch(error => {
          console.log(error)
      });
  }, [client]); // *** Note the dependency

  useEffect(() => {
    client.getDaemonsetsStatus().then(data => {
      console.log(data);
      setDaemonsStatusTime(data.time);
      const daemonsArray = data.daemonsets;
      const keys = ['name', 'namespace', 'status', 'message', 'reason', 'events'];
      daemonsArray.map((daemon: any) => {
        const reason = daemon.reason;
        if (reason === '') {
          daemon["status"] = "OK"
        } else {
          daemon["status"] = "Warning"
        }
      });
      const daemons = daemonsArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
      setDaemonsStatus(daemons);
      })
      .catch(error => {
          console.log(error)
      });
  }, [client]); // *** Note the dependency

  useEffect(() => {
    client.getPodsStatus().then(data => {
      console.log(data);
      setPodsStatusTime(data.time);
      const podsArray = data.pods;
      const keys = ['name', 'namespace', 'message', 'node', 'failingReason'];

      const pods = podsArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
      setPodsStatus(pods);
      })
      .catch(error => {
          console.log(error)
      });
  }, [client]); // *** Note the dependency

  
  return (
    <ContentWrapper gutterSize="none" justifyContent="center" direction="column">
      <EuiFlexGroup alignItems="center" direction="column">
        <EuiFlexItem>
            <EuiTitle size="s">
              <h3 id="KubernetesNodesMemoryTitle">
                  <FormattedMessage
                    id="xpack.fleet.kubernetesObservability.nodesmem"
                    defaultMessage="Kubernetes Nodes Memory"
                  />
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s"><b>Timestamp</b>: {nodeMemtime}</EuiText>
            <EuiSpacer size="s" />
            <EuiBasicTable
              items= {nodesMem}
              columns= {[
                {
                  field: 'name',
                  name: 'Name',
                },
                {
                  field: 'memory_utilization',
                  name: 'Utilization',
                },
                {
                  field: 'message',
                  name: 'Message',
                },
                {
                  field: 'alarm',
                  name: 'Notification Low < 70%, 70% <= Medium < 90%, High >= 90%',
                }
              ]}
              sorting={{
                sort: {
                  field: 'memory_utilization',
                  direction: 'desc',
                },
              }}
            />
        </EuiFlexItem>
        <EuiFlexItem>
            <EuiTitle size="s">
              <h3 id="KubernetesNodesCpuTitle">
                  <FormattedMessage
                    id="xpack.fleet.kubernetesObservability.nodescpu"
                    defaultMessage="Kubernetes Nodes Cpu"
                  />
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s"><b>Timestamp</b>: {nodeCpuTime}</EuiText>
            <EuiSpacer size="s" />
            <EuiBasicTable
              items= {nodesCpu}
              columns= {[
                {
                  field: 'name',
                  name: 'Name',
                },
                {
                  field: 'cpu_utilization',
                  name: 'Utilization',
                },
                {
                  field: 'message',
                  name: 'Message',
                },
                {
                  field: 'alarm',
                  name: 'Notification Low < 70%, 70% <= Medium < 90%, High >= 90%',
                }
              ]}
              sorting={{
                sort: {
                  field: 'cpu_utilization',
                  direction: 'desc',
                },
              }}
            />
        </EuiFlexItem>
        <EuiFlexItem>
            <EuiTitle size="s">
              <h3 id="KubernetesDeploysStatusTitle">
                  <FormattedMessage
                    id="xpack.fleet.kubernetesObservability.deploysstatus"
                    defaultMessage="Kubernetes Deployments Status"
                  />
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s"><b>Timestamp</b>: {deploysStatusTime}</EuiText>
            <EuiSpacer size="s" />
            <EuiBasicTable
              items= {deploysStatus}
              columns= {[
                {
                  field: 'name',
                  name: 'Name',
                },
                {
                  field: 'namespace',
                  name: 'Namespace',
                },
                {
                  field: 'status',
                  name: 'Notification',
                },
                {
                  field: 'message',
                  name: 'Message',
                },
                {
                  field: 'reason',
                  name: 'Reason',
                },
                {
                  field: 'events',
                  name: 'Pod Events',
                }
              ]}
            />
        </EuiFlexItem>
        <EuiFlexItem>
            <EuiTitle size="s">
              <h3 id="KubernetesDaemonsStatusTitle">
                  <FormattedMessage
                    id="xpack.fleet.kubernetesObservability.daemonsstatus"
                    defaultMessage="Kubernetes Daemonsets Status"
                  />
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s"><b>Timestamp</b>: {daemonsStatusTime}</EuiText>
            <EuiSpacer size="s" />
            <EuiBasicTable
              items= {daemonsStatus}
              columns= {[
                {
                  field: 'name',
                  name: 'Name',
                },
                {
                  field: 'namespace',
                  name: 'Namespace',
                },
                {
                  field: 'status',
                  name: 'Notification',
                },
                {
                  field: 'message',
                  name: 'Message',
                },
                {
                  field: 'reason',
                  name: 'Reason',
                },
                {
                  field: 'events',
                  name: 'Pod Events',
                }
              ]}
            />
        </EuiFlexItem>
        <EuiFlexItem>
            <EuiTitle size="s">
              <h3 id="KubernetesPodsStatusTitle">
                  <FormattedMessage
                    id="xpack.fleet.kubernetesObservability.podsstatus"
                    defaultMessage="Kubernetes Pods Status"
                  />
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s"><b>Timestamp</b>: {podsStatusTime}</EuiText>
            <EuiSpacer size="s" />
            <EuiBasicTable
              items= {podsStatus}
              columns= {[
                {
                  field: 'name',
                  name: 'Name',
                },
                {
                  field: 'namespace',
                  name: 'Namespace',
                },
                {
                  field: 'message',
                  name: 'Message',
                },
                {
                  field: 'node',
                  name: 'Node',
                },
                {
                  field: 'failingReason',
                  name: 'Failing Reason',
                }
              ]}
            />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ContentWrapper>

      
  );
}