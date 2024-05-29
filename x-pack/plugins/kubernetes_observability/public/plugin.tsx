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

    async getDeploymentsMemory() {
      console.log("CALLED TO GET DEPLOYMENTS MEMORY")
      const results = await this.http.get('/api/kubernetes/deployments/memory', {version: '1',});
      console.log(results);
      return results;
    }

    async getDeploymentsCpu() {
      console.log("CALLED TO GET DEPLOYMENTS CPU")
      const results = await this.http.get('/api/kubernetes/deployments/cpu', {version: '1',});
      console.log(results);
      return results;
    }

    async getDaemonsetsMemory() {
      console.log("CALLED TO GET DAEMONSETS MEMORY")
      const results = await this.http.get('/api/kubernetes/daemonsets/memory', {version: '1',});
      console.log(results);
      return results;
    }

    async getDaemonsetsCpu() {
      console.log("CALLED TO GET DAEMONSETS CPU")
      const results = await this.http.get('/api/kubernetes/daemonsets/cpu', {version: '1',});
      console.log(results);
      return results;
    }

    async getPodsCpu() {
      console.log("CALLED TO GET PODS CPU")
      const results = await this.http.get('/api/kubernetes/pods/cpu', {version: '1',});
      console.log(results);
      return results;
    }

    async getPodsMemory() {
      console.log("CALLED TO GET PODS MEMORY")
      const results = await this.http.get('/api/kubernetes/pods/memory', {version: '1',});
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
  const [deploysMemTime, setDeploysMemTime] = useState([]);
  const [deploysMem, setDeploysMem] = useState([]);
  const [deploysCpuTime, setDeploysCpuTime] = useState([]);
  const [deploysCpu, setDeploysCpu] = useState([]);
  const [daemonsMemTime, setDaemonsMemTime] = useState([]);
  const [daemonsMem, setDaemonsMem] = useState([]);
  const [daemonsCpuTime, setDaemonsCpuTime] = useState([]);
  const [daemonsCpu, setDaemonsCpu] = useState([]);
  const [podsMemTime, setPodsMemTime] = useState([]);
  const [podsMem, setPodsMem] = useState([]);
  const [podsCpuTime, setPodsCpuTime] = useState([]);
  const [podsCpu, setPodsCpu] = useState([]);
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
    client.getDeploymentsMemory().then(data => {
      console.log(data);
      setDeploysMemTime(data.time);
      const deployArray = data.deployments;
      const keys = ['name', 'namespace',  'reason', 'message', 'alarm'];
      
      const deploys = deployArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
      setDeploysMem(deploys);
      })
      .catch(error => {
          console.log(error)
      });
  }, [client]); // *** Note the dependency

  useEffect(() => {
    client.getDeploymentsCpu().then(data => {
      console.log(data);
      setDeploysCpuTime(data.time);
      const deployArray = data.deployments;
      const keys = ['name', 'namespace',  'reason', 'message', 'alarm'];
      
      const deploys = deployArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
      setDeploysCpu(deploys);
      })
      .catch(error => {
          console.log(error)
      });
  }, [client]); // *** Note the dependency

  useEffect(() => {
    client.getDaemonsetsMemory().then(data => {
      console.log(data);
      setDaemonsMemTime(data.time);
      const daemonArray = data.daemonsets;
      const keys = ['name', 'namespace',  'reason', 'message', 'alarm'];
      
      const daemons = daemonArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
      setDaemonsMem(daemons);
      })
      .catch(error => {
          console.log(error)
      });
  }, [client]); // *** Note the dependency

  useEffect(() => {
    client.getDaemonsetsMemory().then(data => {
      console.log(data);
      setDaemonsCpuTime(data.time);
      const daemonArray = data.daemonsets;
      const keys = ['name', 'namespace',  'reason', 'message', 'alarm'];
      
      const daemons = daemonArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
      setDaemonsCpu(daemons);
      })
      .catch(error => {
          console.log(error)
      });
  }, [client]); // *** Note the dependency

  useEffect(() => {
    client.getPodsMemory().then(data => {
      console.log(data);
      setPodsMemTime(data.time);
      const podsArray = data.pods;
      const keys = ['name', 'namespace',  'node', 'memory_utilization', 'message', 'alarm'];
      
      const pods = podsArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
      setPodsMem(pods);
      })
      .catch(error => {
          console.log(error)
      });
  }, [client]); // *** Note the dependency

  useEffect(() => {
    client.getPodsCpu().then(data => {
      console.log(data);
      setPodsCpuTime(data.time);
      const podsArray = data.pods;
      const keys = ['name', 'namespace',  'node', 'cpu_utilization', 'message', 'alarm'];
      
      const pods = podsArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
      setPodsCpu(pods);
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
              <h3 id="KubernetesDeploymentsMemoryTitle">
                  <FormattedMessage
                    id="xpack.fleet.kubernetesObservability.deploysmem"
                    defaultMessage="Kubernetes Deployments Memory"
                  />
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s"><b>Timestamp</b>: {deploysMemTime}</EuiText>
            <EuiSpacer size="s" />
            <EuiBasicTable
              items= {deploysMem}
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
                  field: 'alarm',
                  name: 'Notification Low < 70%, 70% <= Medium < 90%, High >= 90%',
                },
                {
                  field: 'reason',
                  name: 'Status Reason',
                }
              ]}
              sorting={{
                sort: {
                  field: 'alarm',
                  direction: 'desc',
                },
              }}
            />
        </EuiFlexItem>
        <EuiFlexItem>
            <EuiTitle size="s">
              <h3 id="KubernetesDeploymentsCpuTitle">
                  <FormattedMessage
                    id="xpack.fleet.kubernetesObservability.deployscpu"
                    defaultMessage="Kubernetes Deployments Cpu"
                  />
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s"><b>Timestamp</b>: {deploysCpuTime}</EuiText>
            <EuiSpacer size="s" />
            <EuiBasicTable
              items= {deploysCpu}
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
                  field: 'alarm',
                  name: 'Notification Low < 70%, 70% <= Medium < 90%, High >= 90%',
                },
                {
                  field: 'reason',
                  name: 'Status Reason',
                }
              ]}
              sorting={{
                sort: {
                  field: 'alarm',
                  direction: 'desc',
                },
              }}
            />
        </EuiFlexItem>
        <EuiFlexItem>
            <EuiTitle size="s">
              <h3 id="KubernetesDaemonstesMemoryTitle">
                  <FormattedMessage
                    id="xpack.fleet.kubernetesObservability.daemonsmem"
                    defaultMessage="Kubernetes Daemonsets Memory"
                  />
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s"><b>Timestamp</b>: {daemonsMemTime}</EuiText>
            <EuiSpacer size="s" />
            <EuiBasicTable
              items= {daemonsMem}
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
                  field: 'alarm',
                  name: 'Notification Low < 70%, 70% <= Medium < 90%, High >= 90%',
                },
                {
                  field: 'reason',
                  name: 'Status Reason',
                }
              ]}
              sorting={{
                sort: {
                  field: 'alarm',
                  direction: 'desc',
                },
              }}
            />
        </EuiFlexItem>
        <EuiFlexItem>
            <EuiTitle size="s">
              <h3 id="KubernetesDaemonsetsCpuTitle">
                  <FormattedMessage
                    id="xpack.fleet.kubernetesObservability.daemonscpu"
                    defaultMessage="Kubernetes Daemonsets Cpu"
                  />
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s"><b>Timestamp</b>: {daemonsCpuTime}</EuiText>
            <EuiSpacer size="s" />
            <EuiBasicTable
              items= {daemonsCpu}
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
                  field: 'alarm',
                  name: 'Notification Low < 70%, 70% <= Medium < 90%, High >= 90%',
                },
                {
                  field: 'reason',
                  name: 'Status Reason',
                }
              ]}
              sorting={{
                sort: {
                  field: 'alarm',
                  direction: 'desc',
                },
              }}
            />
        </EuiFlexItem>
        <EuiFlexItem>
            <EuiTitle size="s">
              <h3 id="KubernetesPodsMemoryTitle">
                  <FormattedMessage
                    id="xpack.fleet.kubernetesObservability.podsmem"
                    defaultMessage="Kubernetes Pods Memory"
                  />
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s"><b>Timestamp</b>: {podsMemTime}</EuiText>
            <EuiSpacer size="s" />
            <EuiBasicTable
              items= {podsMem}
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
                  field: 'node',
                  name: 'Node',
                },
                {
                  field: 'memory_utilization',
                  name: 'Memory Utilization',
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
              <h3 id="KubernetesPodsCpuTitle">
                  <FormattedMessage
                    id="xpack.fleet.kubernetesObservability.podscpu"
                    defaultMessage="Kubernetes Pods Cpu"
                  />
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s"><b>Timestamp</b>: {podsCpuTime}</EuiText>
            <EuiSpacer size="s" />
            <EuiBasicTable
              items= {podsCpu}
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
                  field: 'node',
                  name: 'Node',
                },
                {
                  field: 'cpu_utilization',
                  name: 'Memory Cpu',
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