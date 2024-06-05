import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { HttpStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  useEuiTheme,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiSuperSelect,
  EuiButtonGroup,
  EuiButton,
  EuiToolTip,
  EuiIcon,
  EuiBasicTableColumn,
  EuiInMemoryTable,
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

export type Query = {
  namespace: string;
  name: string;
  deployment: string;
};

export const NAMESPACE_OPTIONS = [
  {
    id: 'default',
    label: i18n.translate('xpack.kubernetesObservability.k8sAPI.namespaceButtons.default', {
      defaultMessage: 'default',
    }),
  },
  {
    id: 'kube-system',
    label: i18n.translate('xpack.kubernetesObservability.k8sAPI.namespaceButtons.kube-system', {
      defaultMessage: 'kube-system',
    }),
  },
];

export const NAMESPACE_SELECT_OPTIONS = [
  {
    value: 'all',
    inputDisplay: 'all',
    disabled: false
  },
  {
    value: 'default',
    inputDisplay: 'default',
    disabled: false
  },
  {
    value: 'kube-system',
    inputDisplay: 'kube-system',
    disabled: false
  },
];

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

    async getPodsStatus(pod: any, namespace: any, deployment: any) {
      console.log("CALLED TO GET PODS STATUS")
      console.log(pod);
      console.log(namespace);
      console.log(deployment);
      var query = {} as Query;
      if (pod !== undefined) {
        query['name'] = pod
      }
      if (namespace !== undefined) {
        query['namespace'] = namespace
      }
      if (deployment !== undefined) {
        query['deployment'] = deployment
      }
      const results = await this.http.get('/api/kubernetes/pods/status', {version: '1', query});
      console.log(results);
      return results;
    }

    async getDeploymentsStatus(deployment: any , namespace: any) {
      console.log("CALLED TO GET DEPLOYMENTS STATUS FOR " + deployment + " in " + namespace)
      var query = {} as Query;
      if (deployment !== undefined) {
        query['name'] = deployment
      }
      if (namespace !== undefined) {
        query['namespace'] = namespace
      } 
      const results = await this.http.get('/api/kubernetes/deployments/status', {
        version: '1',
        query,
      });
      console.log(results);
      return results;
    }

    async getDaemonsetsStatus(daemon: any, namespace: any) {
      console.log("CALLED TO GET DAEMONSETS STATUS FOR " + daemon + " in " + namespace)
      var query = {} as Query;
      if (daemon !== undefined) {
        query['name'] = daemon
      }
      if (namespace !== undefined) {
        query['namespace'] = namespace
      }
      const results = await this.http.get('/api/kubernetes/daemonsets/status', {version: '1', query});
      console.log(results);
      return results;
    }

    async getDeploymentsMemory(deployment: any, namespace: any) {
      console.log("CALLED TO GET DEPLOYMENTS MEMORY")
      var query = {} as Query;
      if (deployment !== undefined) {
        query['name'] = deployment
      }
      if (namespace !== undefined) {
        query['namespace'] = namespace
      }
      const results = await this.http.get('/api/kubernetes/deployments/memory', {version: '1', query});
      console.log(results);
      return results;
    }

    async getDeploymentsCpu(deployment: any, namespace: any) {
      console.log("CALLED TO GET DEPLOYMENTS CPU")
      var query = {} as Query;
      if (deployment !== undefined) {
        query['name'] = deployment
      }
      if (namespace !== undefined) {
        query['namespace'] = namespace
      }
      const results = await this.http.get('/api/kubernetes/deployments/cpu', {version: '1', query});
      console.log(results);
      return results;
    }

    async getDaemonsetsMemory(daemon: any, namespace: any) {
      console.log("CALLED TO GET DAEMONSETS MEMORY")
      var query = {} as Query;
      if (daemon !== undefined) {
        query['name'] = daemon
      }
      if (namespace !== undefined) {
        query['namespace'] = namespace
      }
      const results = await this.http.get('/api/kubernetes/daemonsets/memory', {version: '1', query});
      console.log("DAEMONS MEMORY");
      console.log(results);
      return results;
    }

    async getDaemonsetsCpu(daemon: any, namespace: any) {
      console.log("CALLED TO GET DAEMONSETS CPU")
      var query = {} as Query;
      if (daemon !== undefined) {
        query['name'] = daemon
      }
      if (namespace !== undefined) {
        query['namespace'] = namespace
      }
      const results = await this.http.get('/api/kubernetes/daemonsets/cpu', {version: '1', query});
      console.log("DAEMONS CPU");
      console.log(results);
      return results;
    }

    async getPodsCpu(pod: any, namespace: any, deployment: any) {
      console.log("CALLED TO GET PODS CPU")
      var query = {} as Query;
      if (pod !== undefined) {
        query['name'] = pod
      }
      if (namespace !== undefined) {
        query['namespace'] = namespace
      }
      if (deployment !== undefined) {
        query['deployment'] = deployment
      }
      const results = await this.http.get('/api/kubernetes/pods/cpu', {version: '1', query});
      console.log(results);
      return results;
    }

    async getPodsMemory(pod: any, namespace: any, deployment: any) {
      console.log("CALLED TO GET PODS MEMORY")
      var query = {} as Query;
      if (pod !== undefined) {
        query['name'] = pod
      }
      if (namespace !== undefined) {
        query['namespace'] = namespace
      }
      if (deployment !== undefined) {
        query['deployment'] = deployment
      }
      const results = await this.http.get('/api/kubernetes/pods/memory', {version: '1', query});
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
  const [namespace, setNamespace] = useState('all');
  const [hasTimeElapsed, setHasTimeElapsed] = useState(true);
  const [services, setServices] = useState(['all']);
  const [service, setService] = useState('all');
  // useEffect(() => {
  //   const timer = setInterval(() => {
  //     console.log('This will run after 10 second!')
  //     setHasTimeElapsed(true)
  //     setHasTimeElapsed(false)
  //   }, 300000);
  //   return () => clearInterval(timer);
  // }, []);
  
  useEffect(() => {
    if (hasTimeElapsed) {
      client.getNodesMemory().then(data => {
        console.log(data);
        console.log("AAAAAAAAA DUE TO TIMEOUT NODES")
        setNodeMemTime(data.time);
        const nodesArray = data.nodes;
        const keys = ['name', 'memory_utilization', 'message', 'alarm'];
  
        const nodes = nodesArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
        setNodesMem(nodes);
        })
        .catch(error => {
            console.log(error)
        });
    }
  }, [client, hasTimeElapsed]); // *** Note the dependency
  
  useEffect(() => {
    if (hasTimeElapsed) {
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
    }
  }, [client, hasTimeElapsed]); // *** Note the dependency

  useEffect(() => {
    console.log("CALLED DUE TO CHANGE");
    const ns = namespace === 'all' ? undefined : namespace;
    const svc = service === 'all' ? undefined : service;
    console.log("NAMESPACE " + ns);
    client.getDeploymentsStatus(svc, ns).then(data => {
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
        services.indexOf(deploy.name) === -1 ? setServices(services => [...services, deploy.name]) : console.log('already there');
      });
      const deploys = deployArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
      setDeploysStatus(deploys);
      })
      .catch(error => {
          console.log(error)
    });
  }, [client, namespace, hasTimeElapsed, service]); // *** Note the dependency

  useEffect(() => {
    console.log("CALLED DUE TO CHANGE");
    const ns = namespace === 'all' ? undefined : namespace;
    const svc = service === 'all' ? undefined : service;
    console.log("NAMESPACE " + ns);
    client.getDaemonsetsStatus(svc, ns).then(data => {
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
        services.indexOf(daemon.name) === -1 ? setServices(services => [...services, daemon.name]) : console.log('already there');

      });
      const daemons = daemonsArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
      setDaemonsStatus(daemons);
      })
      .catch(error => {
          console.log(error)
      });
  }, [client, namespace, hasTimeElapsed, service]); // *** Note the dependency

  useEffect(() => {
    const ns = namespace === 'all' ? undefined : namespace;
    const svc = service === 'all' ? undefined : service;
    client.getDeploymentsMemory(svc, ns).then(data => {
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
  }, [client, namespace, hasTimeElapsed, service]); // *** Note the dependency

  useEffect(() => {
    const ns = namespace === 'all' ? undefined : namespace;
    const svc = service === 'all' ? undefined : service;
    client.getDeploymentsCpu(svc, ns).then(data => {
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
  }, [client, namespace, hasTimeElapsed, service]); // *** Note the dependency

  useEffect(() => {
    const ns = namespace === 'all' ? undefined : namespace;
    const svc = service === 'all' ? undefined : service;
    client.getDaemonsetsMemory(svc, ns).then(data => {
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
  }, [client, namespace, hasTimeElapsed, service]); // *** Note the dependency

  useEffect(() => {
    const ns = namespace === 'all' ? undefined : namespace;
    const svc = service === 'all' ? undefined : service;
    client.getDaemonsetsCpu(svc, ns).then(data => {
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
  }, [client, namespace, hasTimeElapsed, service]); // *** Note the dependency

  useEffect(() => {
    const ns = namespace === 'all' ? undefined : namespace;
    const svc = service === 'all' ? undefined : service;
    client.getPodsMemory(undefined, ns, svc).then(data => {
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
  }, [client, namespace, hasTimeElapsed, service]); // *** Note the dependency

  useEffect(() => {
    const ns = namespace === 'all' ? undefined : namespace;
    const svc = service === 'all' ? undefined : service;
    client.getPodsCpu(undefined, ns, svc).then(data => {
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
  }, [client, namespace, hasTimeElapsed, service]); // *** Note the dependency

  useEffect(() => {
    const ns = namespace === 'all' ? undefined : namespace;
    const svc = service === 'all' ? undefined : service;
    client.getPodsStatus(undefined, ns, svc).then(data => {
      console.log(data);
      setPodsStatusTime(data.time);
      const podsArray = data.pods;
      const keys = ['name', 'namespace', 'status', 'message', 'node', 'failingReason'];
      podsArray.map((pod: any) => {
        const reason = pod.failingReason;
        if (Object.keys(reason).length === 0) {
          pod["status"] = "OK"
        } else {
          pod["status"] = "Warning"
        }
      });
      const pods = podsArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
      setPodsStatus(pods);
      })
      .catch(error => {
          console.log(error)
      });
  }, [client, namespace, hasTimeElapsed, service]); // *** Note the dependency

  const nodeMemcolumns: Array<EuiBasicTableColumn<any>> = [
    {
      field: 'name',
      name: 'Name',
      width: '80px',
    },
    {
      field: 'memory_utilization',
      name: 'Utilization',
      sortable: true,
      width: '80px',
    },
    {
      field: 'message',
      name: 'Message',
      width: '80px',
    },
    {
      field: 'alarm',
      // name: 'Notification Low < 70%, 70% <= Medium < 90%, High >= 90%',
      name: (
        <div className={'columnHeader__title'}>
          {i18n.translate('xpack.dataVisualizer.dataGrid.nodesMemColumnName', {
            defaultMessage: 'Notification',
          })}
          {
            <EuiToolTip
              content={i18n.translate(
                'xpack.dataVisualizer.dataGrid.nodesMemColumnTooltip',
                {
                  defaultMessage:
                    'Low < 70%, 70% <= Medium < 90%, High >= 90%',
                }
              )}
            >
              <EuiIcon type="questionInCircle" />
            </EuiToolTip>
          }
        </div>
      ),
      render: (value: any, item: any) => {
        if (value === 'Low') {
          return (
            <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="primary"
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage={value}
                  />
            </EuiButton>
          );
        } else if (value === 'Medium') {
          return(
            <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="success"
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage={value}
                  />
            </EuiButton>
          );
        }
        return (
          <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="warning"
          >
            <FormattedMessage
              id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
              defaultMessage={value}
            />
          </EuiButton>
        );    
      },
      width: '80px',
    }
  ]

  const nodeCpucolumns: Array<EuiBasicTableColumn<any>> = [
    {
      field: 'name',
      name: 'Name',
      width: '80px',
    },
    {
      field: 'cpu_utilization',
      name: 'Utilization',
      width: '80px',
      sortable: true,
    },
    {
      field: 'message',
      name: 'Message',
      width: '80px',
    },
    {
      field: 'alarm',
      name: (
        <div className={'columnHeader__title'}>
          {i18n.translate('xpack.dataVisualizer.dataGrid.nodesCpuColumnName', {
            defaultMessage: 'Notification',
          })}
          {
            <EuiToolTip
              content={i18n.translate(
                'xpack.dataVisualizer.dataGrid.nodesCpuColumnTooltip',
                {
                  defaultMessage:
                    'Low < 70%, 70% <= Medium < 90%, High >= 90%',
                }
              )}
            >
              <EuiIcon type="questionInCircle" />
            </EuiToolTip>
          }
        </div>
      ),
      render: (value: any, item: any) => {
        if (value === 'Low') {
          return (
            <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="primary"
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage={value}
                  />
            </EuiButton>
          );
        } else if (value === 'Medium') {
          return(
            <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="success"
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage={value}
                  />
            </EuiButton>
          );
        }
        return (
          <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="warning"
          >
            <FormattedMessage
              id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
              defaultMessage={value}
            />
          </EuiButton>
        );    
      },
      width: '80px',
    }
  ]

  const deployStatuscolumns: Array<EuiBasicTableColumn<any>> = [
    {
      field: 'name',
      name: 'Name',
      width: '80px',
    },
    {
      field: 'namespace',
      name: 'Namespace',
      width: '80px',
    },
    {
      field: 'status',
      name: 'Notification',
      width: '80px',
      render: (value: any, item: any) => {
        if (value === 'OK') {
          return (
            <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="success"
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage={value}
                  />
            </EuiButton>
          );
        }
        return (
          <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="warning"
          >
            <FormattedMessage
              id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
              defaultMessage={value}
            />
          </EuiButton>
        );    
      },
      sortable: ({ status }) => {
        if (status == 'Warning'){
          return 1;
        } else {
          return 0;
        }
      },
    },
    {
      field: 'message',
      name: 'Message',
      width: '80px',
    },
    {
      field: 'reason',
      name: 'Reason',
      width: '80px',
    },
    {
      field: 'events',
      name: 'Pod Events',
      width: '80px',
    }
  ]

  const daemonsStatuscolumns: Array<EuiBasicTableColumn<any>> = [
    {
      field: 'name',
      name: 'Name',
      width: '80px',
    },
    {
      field: 'namespace',
      name: 'Namespace',
      width: '80px',
    },
    {
      field: 'status',
      name: 'Notification',
      width: '80px',
      render: (value: any, item: any) => {
        if (value === 'OK') {
          return (
            <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="success"
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage={value}
                  />
            </EuiButton>
          );
        }
        return (
          <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="warning"
          >
            <FormattedMessage
              id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
              defaultMessage={value}
            />
          </EuiButton>
        );    
      },
      sortable: ({ status }) => {
        if (status == 'Warning'){
          return 1;
        } else {
          return 0;
        }
      },
    },
    {
      field: 'message',
      name: 'Message',
      width: '80px',
    },
    {
      field: 'reason',
      name: 'Reason',
      width: '80px',
    },
    {
      field: 'events',
      name: 'Pod Events',
      width: '80px',
    }
  ]

  const deploysMemcolumns: Array<EuiBasicTableColumn<any>> = [
    {
      field: 'name',
      name: 'Name',
      width: '80px',
    },
    {
      field: 'namespace',
      name: 'Namespace',
      width: '80px',
    },
    {
      field: 'message',
      name: 'Message',
      width: '80px',
    },
    {
      field: 'alarm',
      name: (
        <div className={'columnHeader__title'}>
          {i18n.translate('xpack.dataVisualizer.dataGrid.deploysMemColumnName', {
            defaultMessage: 'Notification',
          })}
          {
            <EuiToolTip
              content={i18n.translate(
                'xpack.dataVisualizer.dataGrid.deploysMemColumnTooltip',
                {
                  defaultMessage:
                    'Low < 70%, 70% <= Medium < 90%, High >= 90%',
                }
              )}
            >
              <EuiIcon type="questionInCircle" />
            </EuiToolTip>
          }
        </div>
      ),
      render: (value: any, item: any) => {
        if (value === 'Low') {
          return (
            <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="primary"
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage={value}
                  />
            </EuiButton>
          );
        } else if (value === 'Medium') {
          return(
            <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="success"
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage={value}
                  />
            </EuiButton>
          );
        }
        return (
          <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="warning"
          >
            <FormattedMessage
              id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
              defaultMessage={value}
            />
          </EuiButton>
        );    
      },
      width: '80px',
      sortable: ({ alarm }) => {
        if (alarm == 'Low'){
          return 0;
        } else if (alarm == 'Medium'){
          return 1;
        } else {
          return 2;
        }
      },
    },
    {
      field: 'reason',
      name: 'Status Reason',
      width: '80px',
    }
  ]

  const deploysCpucolumns: Array<EuiBasicTableColumn<any>> = [
    {
      field: 'name',
      name: 'Name',
      width: '80px',
    },
    {
      field: 'namespace',
      name: 'Namespace',
      width: '80px',
    },
    {
      field: 'message',
      name: 'Message',
      width: '80px',
    },
    {
      field: 'alarm',
      name: (
        <div className={'columnHeader__title'}>
          {i18n.translate('xpack.dataVisualizer.dataGrid.deploysCpuColumnName', {
            defaultMessage: 'Notification',
          })}
          {
            <EuiToolTip
              content={i18n.translate(
                'xpack.dataVisualizer.dataGrid.deploysCpuColumnTooltip',
                {
                  defaultMessage:
                    'Low < 70%, 70% <= Medium < 90%, High >= 90%',
                }
              )}
            >
              <EuiIcon type="questionInCircle" />
            </EuiToolTip>
          }
        </div>
      ),
      render: (value: any, item: any) => {
        if (value === 'Low') {
          return (
            <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="primary"
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage={value}
                  />
            </EuiButton>
          );
        } else if (value === 'Medium') {
          return(
            <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="success"
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage={value}
                  />
            </EuiButton>
          );
        }
        return (
          <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="warning"
          >
            <FormattedMessage
              id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
              defaultMessage={value}
            />
          </EuiButton>
        );    
      },
      width: '80px',
      sortable: ({ alarm }) => {
        if (alarm == 'Low'){
          return 0;
        } else if (alarm == 'Medium'){
          return 1;
        } else {
          return 2;
        }
      },
    },
    {
      field: 'reason',
      name: 'Status Reason',
      width: '80px',
    }
  ]

  const daemonsMemcolumns: Array<EuiBasicTableColumn<any>> = [
    {
      field: 'name',
      name: 'Name',
      width: '80px',
    },
    {
      field: 'namespace',
      name: 'Namespace',
      width: '80px',
    },
    {
      field: 'message',
      name: 'Message',
      width: '80px',
    },
    {
      field: 'alarm',
      name: (
        <div className={'columnHeader__title'}>
          {i18n.translate('xpack.dataVisualizer.dataGrid.daemonsMemColumnName', {
            defaultMessage: 'Notification',
          })}
          {
            <EuiToolTip
              content={i18n.translate(
                'xpack.dataVisualizer.dataGrid.daemonsMemColumnTooltip',
                {
                  defaultMessage:
                    'Low < 70%, 70% <= Medium < 90%, High >= 90%',
                }
              )}
            >
              <EuiIcon type="questionInCircle" />
            </EuiToolTip>
          }
        </div>
      ),
      render: (value: any, item: any) => {
        if (value === 'Low') {
          return (
            <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="primary"
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage={value}
                  />
            </EuiButton>
          );
        } else if (value === 'Medium') {
          return(
            <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="success"
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage={value}
                  />
            </EuiButton>
          );
        }
        return (
          <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="warning"
          >
            <FormattedMessage
              id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
              defaultMessage={value}
            />
          </EuiButton>
        );    
      },
      width: '80px',
      sortable: ({ alarm }) => {
        if (alarm == 'Low'){
          return 0;
        } else if (alarm == 'Medium'){
          return 1;
        } else {
          return 2;
        }
      },
    },
    {
      field: 'reason',
      name: 'Status Reason',
      width: '80px',
    }
  ]

  const daemonsCpucolumns: Array<EuiBasicTableColumn<any>> = [
    {
      field: 'name',
      name: 'Name',
      width: '80px',
    },
    {
      field: 'namespace',
      name: 'Namespace',
      width: '80px',
    },
    {
      field: 'message',
      name: 'Message',
      width: '80px',
    },
    {
      field: 'alarm',
      name: (
        <div className={'columnHeader__title'}>
          {i18n.translate('xpack.dataVisualizer.dataGrid.daemonsCpuColumnName', {
            defaultMessage: 'Notification',
          })}
          {
            <EuiToolTip
              content={i18n.translate(
                'xpack.dataVisualizer.dataGrid.daemonsCpuColumnTooltip',
                {
                  defaultMessage:
                    'Low < 70%, 70% <= Medium < 90%, High >= 90%',
                }
              )}
            >
              <EuiIcon type="questionInCircle" />
            </EuiToolTip>
          }
        </div>
      ),
      render: (value: any, item: any) => {
        if (value === 'Low') {
          return (
            <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="primary"
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage={value}
                  />
            </EuiButton>
          );
        } else if (value === 'Medium') {
          return(
            <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="success"
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage={value}
                  />
            </EuiButton>
          );
        }
        return (
          <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="warning"
          >
            <FormattedMessage
              id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
              defaultMessage={value}
            />
          </EuiButton>
        );    
      },
      width: '80px',
      sortable: ({ alarm }) => {
        if (alarm == 'Low'){
          return 0;
        } else if (alarm == 'Medium'){
          return 1;
        } else {
          return 2;
        }
      },
    },
    {
      field: 'reason',
      name: 'Status Reason',
      width: '80px',
    }
  ]

  const podsMemcolumns: Array<EuiBasicTableColumn<any>> = [
    {
      field: 'name',
      name: 'Name',
      width: '80px',
    },
    {
      field: 'namespace',
      name: 'Namespace',
      width: '80px',
    },
    {
      field: 'node',
      name: 'Node',
      width: '80px',
    },
    {
      field: 'memory_utilization',
      name: 'Memory Utilization',
      width: '80px',
      sortable: true,
    },
    {
      field: 'message',
      name: 'Message',
      width: '80px',
    },
    {
      field: 'alarm',
      name: (
        <div className={'columnHeader__title'}>
          {i18n.translate('xpack.dataVisualizer.dataGrid.podsMemColumnName', {
            defaultMessage: 'Notification',
          })}
          {
            <EuiToolTip
              content={i18n.translate(
                'xpack.dataVisualizer.dataGrid.podsMemColumnTooltip',
                {
                  defaultMessage:
                    'Low < 70%, 70% <= Medium < 90%, High >= 90%',
                }
              )}
            >
              <EuiIcon type="questionInCircle" />
            </EuiToolTip>
          }
        </div>
      ),
      render: (value: any, item: any) => {
        if (value === 'Low') {
          return (
            <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="primary"
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage={value}
                  />
            </EuiButton>
          );
        } else if (value === 'Medium') {
          return(
            <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="success"
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage={value}
                  />
            </EuiButton>
          );
        }
        return (
          <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="warning"
          >
            <FormattedMessage
              id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
              defaultMessage={value}
            />
          </EuiButton>
        );    
      },
      width: '80px',
    }
  ]

  const pocsCpucolumns: Array<EuiBasicTableColumn<any>> = [
    {
      field: 'name',
      name: 'Name',
      width: '80px',
    },
    {
      field: 'namespace',
      name: 'Namespace',
      width: '80px',
    },
    {
      field: 'node',
      name: 'Node',
      width: '80px',
    },
    {
      field: 'cpu_utilization',
      name: 'Cpu Utilization',
      width: '80px',
      sortable: true,
    },
    {
      field: 'message',
      name: 'Message',
      width: '80px',
    },
    {
      field: 'alarm',
      name: (
        <div className={'columnHeader__title'}>
          {i18n.translate('xpack.dataVisualizer.dataGrid.podsCpuColumnName', {
            defaultMessage: 'Notification',
          })}
          {
            <EuiToolTip
              content={i18n.translate(
                'xpack.dataVisualizer.dataGrid.podsCpuColumnTooltip',
                {
                  defaultMessage:
                    'Low < 70%, 70% <= Medium < 90%, High >= 90%',
                }
              )}
            >
              <EuiIcon type="questionInCircle" />
            </EuiToolTip>
          }
        </div>
      ),
      render: (value: any, item: any) => {
        if (value === 'Low') {
          return (
            <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="primary"
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage={value}
                  />
            </EuiButton>
          );
        } else if (value === 'Medium') {
          return(
            <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="success"
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage={value}
                  />
            </EuiButton>
          );
        }
        return (
          <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="warning"
          >
            <FormattedMessage
              id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
              defaultMessage={value}
            />
          </EuiButton>
        );    
      },
      width: '80px',
    }
  ]

  const podsStatuscolumns: Array<EuiBasicTableColumn<any>> = [
    {
      field: 'name',
      name: 'Name',
      width: '80px',
    },
    {
      field: 'namespace',
      name: 'Namespace',
      width: '80px',
    },
    {
      field: 'status',
      name: 'Notification',
      render: (value: any, item: any) => {
        if (value === 'OK') {
          return (
            <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="success"
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage={value}
                  />
            </EuiButton>
          );
        }
        return (
          <EuiButton
                  onClick={() => console.log(value)}
                  size={'s'}
                  color="warning"
          >
            <FormattedMessage
              id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
              defaultMessage={value}
            />
          </EuiButton>
        );    
      },
      width: '80px',
      sortable: ({ status }) => {
        if (status == 'Warning'){
          return 1;
        } else {
          return 0;
        }
      }
    },
    {
      field: 'message',
      name: 'Message',
      width: '80px',
    },
    {
      field: 'node',
      name: 'Node',
      width: '80px',
    },
    {
      field: 'failingReason',
      name: 'Failing Reason',
      width: '80px',
    }
  ]

  return (
    <ContentWrapper gutterSize="none" justifyContent="center" direction="column">
      <EuiFlexGroup alignItems="flexStart" direction="row">
        <EuiFlexItem>
          <EuiDescribedFormGroup
            title={
              <h4>
                <FormattedMessage
                  id="xpack.k8sobservability.namespaces.selectNamespaceTitle"
                  defaultMessage="Namespace"
                />
              </h4>
            }
            description={
              <FormattedMessage
                id="xpack.k8sobservability.namespaces.selectNamespaceDesc"
                defaultMessage="Select namespace to filter upon."
              />
            }
          >
            <EuiFormRow
              fullWidth
              isDisabled={false}
              isInvalid={false}
            >
              <EuiSuperSelect
                disabled={false}
                valueOfSelected={namespace}
                fullWidth
                onChange={(id) => setNamespace(id)}
                options={NAMESPACE_SELECT_OPTIONS}
              />
              </EuiFormRow>
          </EuiDescribedFormGroup>
          <EuiSpacer size="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiDescribedFormGroup
            title={
              <h4>
                <FormattedMessage
                  id="xpack.k8sobservability.services.selectServiceTitle"
                  defaultMessage="Service"
                />
              </h4>
            }
            description={
              <FormattedMessage
                id="xpack.k8sobservability.services.selectServiceDesc"
                defaultMessage="Select service to filter upon."
              />
            }
          >
            <EuiFormRow
              fullWidth
              isDisabled={false}
              isInvalid={false}
            >
              <EuiSuperSelect
                disabled={false}
                valueOfSelected={service}
                fullWidth
                onChange={(id) => setService(id)}
                options={services.map((service) => ({
                  value: service,
                  inputDisplay: service,
                }))}
              />
              </EuiFormRow>
          </EuiDescribedFormGroup>
          <EuiSpacer size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
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
            <EuiInMemoryTable
              items= {nodesMem}
              columns= {nodeMemcolumns}
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
            <EuiInMemoryTable
              items= {nodesCpu}
              columns= {nodeCpucolumns}
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
            <EuiInMemoryTable
              items= {deploysStatus}
              columns= {deployStatuscolumns}
              sorting={{
                sort: {
                  field: 'status',
                  direction: 'desc',
                },
              }}
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
            <EuiInMemoryTable
              items= {daemonsStatus}
              columns= {daemonsStatuscolumns}
              sorting={{
                sort: {
                  field: 'status',
                  direction: 'desc',
                },
              }}
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
            <EuiInMemoryTable
              items= {deploysMem}
              columns= {deploysMemcolumns}
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
            <EuiInMemoryTable
              items= {deploysCpu}
              columns= {deploysCpucolumns}
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
            <EuiInMemoryTable
              items= {daemonsMem}
              columns= {daemonsMemcolumns}
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
            <EuiInMemoryTable
              items= {daemonsCpu}
              columns= {daemonsCpucolumns}
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
            <EuiInMemoryTable
              items= {podsMem}
              columns= {podsMemcolumns}
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
            <EuiInMemoryTable
              items= {podsCpu}
              columns= {pocsCpucolumns}
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
            <EuiInMemoryTable
              items= {podsStatus}
              columns= {podsStatuscolumns}
              sorting={{
                sort: {
                  field: 'status',
                  direction: 'desc',
                },
              }}
            />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ContentWrapper>

      
  );
}