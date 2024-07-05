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
  EuiCodeBlock,
  EuiPortal,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiButton,
  EuiToolTip,
  EuiIcon,
  EuiBasicTableColumn,
  EuiInMemoryTable,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';

const ContentWrapper = styled(EuiFlexGroup)`
  height: 100%;
  margin: 0 auto;
`;

const CommandCode = styled.div.attrs(() => {
  return {
    className: 'eui-textBreakAll',
  };
})`
  margin-right: ${(props) => props.theme.eui.euiSizeM};
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
  daemonset: string;
  period: string;
};

export type AIQuery = {
  content: string;
  assistant_id: string;
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

export const PERIODS_SELECT_OPTIONS = [
  {
    value: 'now-5m',
    inputDisplay: 'now-5m',
    disabled: false
  },
  {
    value: 'now-1h',
    inputDisplay: 'now-1h',
    disabled: false
  },
  {
    value: 'now-4h',
    inputDisplay: 'now-4h',
    disabled: false
  },
  {
    value: 'now-8h',
    inputDisplay: 'now-8h',
    disabled: false
  },
  {
    value: 'now-24h',
    inputDisplay: 'now-24h',
    disabled: false
  },
  {
    value: 'now-2d',
    inputDisplay: 'now-2d',
    disabled: false
  },
  {
    value: 'now-1w',
    inputDisplay: 'now-1w',
    disabled: false
  },
];

export class PublicKubernetesObservabilityClient {
    constructor(private readonly http: HttpStart) {}
     
    async analyze(content: string, assistant_id: string) {
      console.log("CALLED TO ASK OPENAI")
      console.log("assistant is " + assistant_id);
      var query = {} as AIQuery;
      if (content !== undefined) {
        query['content'] = content
      }
      if (assistant_id !== '') {
        query['assistant_id'] = assistant_id
      }
      console.log(query);
      const results = await this.http.get('/api/kubernetes/openai/analyze', {version: '1', query});
      return results;
    }
    
    async getNodesMemory(period: string) {
      console.log("CALLED TO GET NODES MEM")
      var query = {} as Query;
      if (period !== undefined) {
        query['period'] = period
      }
      const results = await this.http.get('/api/kubernetes/nodes/memory', {version: '1', query});
      console.log(results);
      return results;
    }

    async getNodesCpu(period: string) {
      console.log("CALLED TO GET NODES CPU")
      var query = {} as Query;
      if (period !== undefined) {
        query['period'] = period
      }
      const results = await this.http.get('/api/kubernetes/nodes/cpu', {version: '1', query});
      console.log(results);
      return results;
    }

    async getPodsStatus(pod: any, namespace: any, deployment: any, daemonset: any) {
      console.log("CALLED TO GET PODS STATUS")
      console.log(pod);
      console.log(namespace);
      console.log(deployment);
      console.log(daemonset);
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
      if (daemonset !== undefined) {
        query['daemonset'] = daemonset
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

    async getPodsCpu(pod: any, namespace: any, deployment: any, daemonset: any) {
      console.log("CALLED TO GET PODS CPU")
      console.log(pod)
      console.log(namespace)
      console.log(deployment)
      console.log(daemonset)
      
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
      if (daemonset !== undefined) {
        query['daemonset'] = daemonset
      }
      console.log("getPodsCpu query")
      console.log(query);
      const results = await this.http.get('/api/kubernetes/pods/cpu', {version: '1', query});
      console.log("PODS CPU results")
      console.log(results);
      return results;
    }

    async getPodsMemory(pod: any, namespace: any, deployment: any, daemonset: any) {
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
      if (daemonset !== undefined) {
        query['daemonset'] = daemonset
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
  const [svcIsDeploy, setSvcIsDeploy] = useState(false);
  const [svcIsDaemon, setSvcIsDaemon] = useState(false);
  const [triggerPodStatus, setTriggerPodStatus] = useState(true);
  const [triggerPodCpu, setTriggerPodCpu] = useState(true);
  const [triggerPodMem, setTriggerPodMem] = useState(true);
  const [period, setPeriod] = useState('now-5m');
  const [assistant, setAssistant] = useState('');
  const [nodeMemAnalysis, setNodeMemAnalysis] = useState('');
  const [nodeCpuAnalysis, setNodeCpuAnalysis] = useState('');
  const [deployStatusAnalysis, setDeployStatusAnalysis] = useState('');
  const [fetchDeployStatusAnalysis, setFetchDeployStatusAnalysis] = useState<boolean>(false);
  const [daemonStatusAnalysis, setDaemonStatusAnalysis] = useState('');
  const [fetchDaemonStatusAnalysis, setFetchDaemonStatusAnalysis] = useState<boolean>(false);
  const [deployMemAnalysis, setDeployMemAnalysis] = useState('');
  const [fetchDeployMemAnalysis, setFetchDeployMemAnalysis] = useState<boolean>(false);
  const [deployCpuAnalysis, setDeployCpuAnalysis] = useState('');
  const [fetchDeployCpuAnalysis, setFetchDeployCpuAnalysis] = useState<boolean>(false);
  const [daemonMemAnalysis, setDaemonMemAnalysis] = useState('');
  const [fetchDaemonMemAnalysis, setFetchDaemonMemAnalysis] = useState<boolean>(false);
  const [daemonCpuAnalysis, setDaemonCpuAnalysis] = useState('');
  const [fetchDaemonCpuAnalysis, setFetchDaemonCpuAnalysis] = useState<boolean>(false);
  const [podMemAnalysis, setPodMemAnalysis] = useState('');
  const [fetchPodMemAnalysis, setFetchPodMemAnalysis] = useState<boolean>(false);
  const [podCpuAnalysis, setPodCpuAnalysis] = useState('');
  const [fetchPodCpuAnalysis, setFetchPodCpuAnalysis] = useState<boolean>(false);
  const [podStatusAnalysis, setPodStatusAnalysis] = useState('');
  const [fetchPodStatusAnalysis, setFetchPodStatusAnalysis] = useState<boolean>(false);
  const [isNodesMemFlyoutOpen, setIsNodesMemFlyoutOpen] = useState<boolean>(false);
  const [isNodesCpuFlyoutOpen, setIsNodesCpuFlyoutOpen] = useState<boolean>(false);
  const [isDeployStatusFlyoutOpen, setIsDeployStatusFlyoutOpen] = useState<boolean>(false);
  const [isDaemonStatusFlyoutOpen, setIsDaemonStatusFlyoutOpen] = useState<boolean>(false);
  const [isDeployMemFlyoutOpen, setIsDeployMemFlyoutOpen] = useState<boolean>(false);
  const [isDeployCpuFlyoutOpen, setIsDeployCpuFlyoutOpen] = useState<boolean>(false);
  const [isDaemonMemFlyoutOpen, setIsDaemonMemFlyoutOpen] = useState<boolean>(false);
  const [isDaemonCpuFlyoutOpen, setIsDaemonCpuFlyoutOpen] = useState<boolean>(false);
  const [isPodMemFlyoutOpen, setIsPodMemFlyoutOpen] = useState<boolean>(false);
  const [isPodCpuFlyoutOpen, setIsPodCpuFlyoutOpen] = useState<boolean>(false);
  const [isPodStatusFlyoutOpen, setIsPodStatusFlyoutOpen] = useState<boolean>(false);


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
      client.getNodesMemory(period).then(data => {
        console.log(data);
        console.log("AAAAAAAAA DUE TO period change")
        setNodeMemTime(data.time);
        const nodesArray = data.nodes;
        const keys = ['name', 'memory_utilization', 'message', 'alarm', 'logs'];
        
        const nodes = nodesArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
        setNodesMem(nodes);
        if (nodes.length !== 0) {
          var content = JSON.stringify(nodes);
          content = `What can you tell me about my kubernetes nodes memory utilization based on the following json: ${content} \n Return only the analysis and suggestions part"`
          client.analyze(content, assistant).then(result => {
            console.log(result);
            setAssistant(result.assistant);
            setNodeMemAnalysis(result.response);
            })
            .catch(error => {
                console.log(error)
            });
        }
        })
        .catch(error => {
            console.log(error)
        });
    }
  }, [client, hasTimeElapsed, period]); // *** Note the dependency
  
  useEffect(() => {
    if (hasTimeElapsed) {
      client.getNodesCpu(period).then(data => {
        console.log(data);
        setNodeCpuTime(data.time);
        const nodesArray = data.nodes;
        const keys = ['name', 'cpu_utilization', 'message', 'alarm'];

        const nodes = nodesArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
        setNodesCpu(nodes);
        if (nodes.length !== 0) {
          var content = JSON.stringify(nodes);
          content = `What can you tell me about my kubernetes nodes cpu utilization based on the following json: ${content} \n Return only the analysis and suggestions part"`
          client.analyze(content, assistant).then(result => {
            console.log(result);
            setAssistant(result.assistant);
            setNodeCpuAnalysis(result.response);
            })
            .catch(error => {
                console.log(error)
            });
        }
        })
        .catch(error => {
            console.log(error)
      });
    }
  }, [client, hasTimeElapsed, period]); // *** Note the dependency

  useEffect(() => {
    console.log("CALLED DUE TO CHANGE");
    const ns = namespace === 'all' ? undefined : namespace;
    const svc = service === 'all' ? undefined : service;
    console.log("NAMESPACE " + ns);
    client.getDeploymentsStatus(svc, ns).then(data => {
      console.log(data);
      setDeploysStatusTime(data.time);
      const deployArray = data.deployments;
      const keys = ['name', 'namespace', 'status', 'message', 'reason', 'events', 'logs'];
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
    console.log("CALLED DUE TO CHANGE in fetchDeployStatusAnalysis");
    if (deploysStatus.length !== 0 && fetchDeployStatusAnalysis) {
      var content = JSON.stringify(deploysStatus);
      content = `What can you tell me about my kubernetes deployments status based on the following json: ${content} \n Return only the analysis and suggestions part"`
      client.analyze(content, assistant).then(result => {
        console.log(result);
        setAssistant(result.assistant);
        setDeployStatusAnalysis(result.response);
        setIsDeployStatusFlyoutOpen(true);
        setFetchDeployStatusAnalysis(false);
        console.log("The response for deploys status is here");
        console.log(result.response)
        })
        .catch(error => {
            console.log(error)
        });
    }
  }, [fetchDeployStatusAnalysis]); // *** Note the dependency

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
    console.log("CALLED DUE TO CHANGE in fetchDaemonStatusAnalysis");
    if (daemonsStatus.length !== 0 && fetchDaemonStatusAnalysis) {
      var content = JSON.stringify(daemonsStatus);
      content = `What can you tell me about my kubernetes daemonsets status based on the following json: ${content} \n Return only the analysis and suggestions part"`
      client.analyze(content, assistant).then(result => {
        console.log(result);
        setAssistant(result.assistant);
        setDaemonStatusAnalysis(result.response);
        setIsDaemonStatusFlyoutOpen(true);
        setFetchDaemonStatusAnalysis(false);
        console.log("The response for daemons status is here");
        console.log(result.response)
        })
        .catch(error => {
            console.log(error)
        });
    }
  }, [fetchDaemonStatusAnalysis]); // *** Note the dependency

  useEffect(() => {
    const ns = namespace === 'all' ? undefined : namespace;
    const svc = service === 'all' ? undefined : service;
    client.getDeploymentsMemory(svc, ns).then(data => {
      console.log(data);
      setDeploysMemTime(data.time);
      const deployArray = data.deployments;
      const keys = ['name', 'namespace',  'reason', 'message', 'alarm'];
      
      const deploys = deployArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
      const found = deploys.some(el => el.name === service);
      if (found){
        const podsArray = data.deployments[0].pods;
        const keys = ['name', 'namespace',  'node', 'memory_utilization', 'message', 'alarm'];
        const pods = podsArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
        setPodsMem(pods);
      }
      
      setDeploysMem(deploys);
      })
      .catch(error => {
          console.log(error)
      });
  }, [client, namespace, hasTimeElapsed, service]); // *** Note the dependency

  useEffect(() => {
    console.log("CALLED DUE TO CHANGE in fetchDeployMemAnalysis");
    if (deploysMem.length !== 0 && fetchDeployMemAnalysis) {
      var content = JSON.stringify(deploysMem);
      content = `What can you tell me about my kubernetes deployments memory utilization based on the following json: ${content} \n Return only the analysis and suggestions part"`
      client.analyze(content, assistant).then(result => {
        console.log(result);
        setAssistant(result.assistant);
        setDeployMemAnalysis(result.response);
        setIsDeployMemFlyoutOpen(true);
        setFetchDeployMemAnalysis(false);
        console.log("The response for deploys mem is here");
        console.log(result.response)
        })
        .catch(error => {
            console.log(error)
        });
    }
  }, [fetchDeployMemAnalysis]); // *** Note the dependency

  useEffect(() => {
    const ns = namespace === 'all' ? undefined : namespace;
    const svc = service === 'all' ? undefined : service;
    if (service === 'all') {
      setSvcIsDaemon(false);
      setSvcIsDeploy(false);
      setTriggerPodStatus(true)
      setTriggerPodCpu(true)
      setTriggerPodMem(true)
    }
    client.getDeploymentsCpu(svc, ns).then(data => {
      console.log(data);
      setDeploysCpuTime(data.time);
      const deployArray = data.deployments;
      const keys = ['name', 'namespace',  'reason', 'message', 'alarm'];
      
      const deploys = deployArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
      const found = deploys.some(el => el.name === service);
      if (found){
        setSvcIsDeploy(true);
        setSvcIsDaemon(false);
        setTriggerPodStatus(true)
        setTriggerPodCpu(true)
        setTriggerPodMem(true)
        // const podsArray = data.deployments[0].pods;
        // const podkeys = ['name', 'namespace',  'node', 'cpu_utilization', 'message', 'alarm'];
        // const pods = podsArray.map(item => podkeys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
        // setPodsCpu(pods);
      } else {
        setSvcIsDeploy(false);
      }
      setDeploysCpu(deploys);
      })
      .catch(error => {
          console.log(error)
      });
  }, [client, namespace, hasTimeElapsed, service]); // *** Note the dependency


  useEffect(() => {
    console.log("CALLED DUE TO CHANGE in fetchDeployCpuAnalysis");
    if (deploysCpu.length !== 0 && fetchDeployCpuAnalysis) {
      var content = JSON.stringify(deploysCpu);
      content = `What can you tell me about my kubernetes deployments cpu utilization based on the following json: ${content} \n Return only the analysis and suggestions part"`
      client.analyze(content, assistant).then(result => {
        console.log(result);
        setAssistant(result.assistant);
        setDeployCpuAnalysis(result.response);
        setIsDeployCpuFlyoutOpen(true);
        setFetchDeployCpuAnalysis(false);
        console.log("The response for deploys cpu is here");
        console.log(result.response)
        })
        .catch(error => {
            console.log(error)
        });
    }
  }, [fetchDeployCpuAnalysis]); // *** Note the dependency

  useEffect(() => {
    console.log("Triggered to get daemonsets memory");
    console.log(namespace)
    console.log(service)
    const ns = namespace === 'all' ? undefined : namespace;
    const svc = service === 'all' ? undefined : service;
    client.getDaemonsetsMemory(svc, ns).then(data => {
      console.log(data);
      setDaemonsMemTime(data.time);
      const daemonArray = data.daemonsets;
      const keys = ['name', 'namespace',  'reason', 'message', 'alarm'];
      
      const daemons = daemonArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
      const found = daemons.some(el => el.name === service);
      console.log("daemon found");
      console.log(found);
      console.log(daemons);
      if (found){
        const podsArray = data.daemonsets[0].pods;
        const keys = ['name', 'namespace',  'node', 'memory_utilization', 'message', 'alarm'];
        const pods = podsArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
        setPodsMem(pods);
      }
      setDaemonsMem(daemons);
      })
      .catch(error => {
          console.log(error)
      });
  }, [client, namespace, hasTimeElapsed, service]); // *** Note the dependency

  useEffect(() => {
    console.log("CALLED DUE TO CHANGE in fetchDaemonMemAnalysis");
    if (daemonsMem.length !== 0 && fetchDaemonMemAnalysis) {
      var content = JSON.stringify(daemonsMem);
      content = `What can you tell me about my kubernetes daemonsets memory utilization based on the following json: ${content} \n Return only the analysis and suggestions part"`
      client.analyze(content, assistant).then(result => {
        console.log(result);
        setAssistant(result.assistant);
        setDaemonMemAnalysis(result.response);
        setIsDaemonMemFlyoutOpen(true);
        setFetchDaemonMemAnalysis(false);
        console.log("The response for daemons mem is here");
        console.log(result.response)
        })
        .catch(error => {
            console.log(error)
        });
    }
  }, [fetchDaemonMemAnalysis]); // *** Note the dependency

  useEffect(() => {
    const ns = namespace === 'all' ? undefined : namespace;
    const svc = service === 'all' ? undefined : service;
    client.getDaemonsetsCpu(svc, ns).then(data => {
      console.log(data);
      setDaemonsCpuTime(data.time);
      const daemonArray = data.daemonsets;
      const keys = ['name', 'namespace',  'reason', 'message', 'alarm'];
      
      const daemons = daemonArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
      const found = daemons.some(el => el.name === service);
      if (found){
        setSvcIsDeploy(false);
        setSvcIsDaemon(true);
        setTriggerPodStatus(true)
        setTriggerPodCpu(true)
        setTriggerPodMem(true)
        // setTriggerPodStatus(true)
        // const podsArray = data.daemonsets[0].pods;
        // const podkeys = ['name', 'namespace',  'node', 'cpu_utilization', 'message', 'alarm'];
        // const pods = podsArray.map(item => podkeys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
        // setPodsCpu(pods);
      } else {
        setSvcIsDaemon(false);
      }
      setDaemonsCpu(daemons);
      })
      .catch(error => {
          console.log(error)
      });
  }, [client, namespace, hasTimeElapsed, service]); // *** Note the dependency

  useEffect(() => {
    console.log("CALLED DUE TO CHANGE in fetchDaemonCpuAnalysis");
    if (daemonsCpu.length !== 0 && fetchDaemonCpuAnalysis) {
      var content = JSON.stringify(daemonsCpu);
      content = `What can you tell me about my kubernetes daemonsets cpu utilization based on the following json: ${content} \n Return only the analysis and suggestions part"`
      client.analyze(content, assistant).then(result => {
        console.log(result);
        setAssistant(result.assistant);
        setDaemonCpuAnalysis(result.response);
        setIsDaemonCpuFlyoutOpen(true);
        setFetchDaemonCpuAnalysis(false);
        console.log("The response for daemons cpu is here");
        console.log(result.response)
        })
        .catch(error => {
            console.log(error)
        });
    }
  }, [fetchDaemonCpuAnalysis]); // *** Note the dependency

  useEffect(() => {
    const ns = namespace === 'all' ? undefined : namespace;
    console.log("Get pod memory before");
    console.log(svcIsDeploy);
    console.log(svcIsDaemon);
    console.log(service);
    const deploy = svcIsDeploy ? service : undefined;
    const daemon = svcIsDaemon ? service : undefined;
    if (triggerPodMem) {
      client.getPodsMemory(undefined, ns, deploy, daemon).then(data => {
        console.log(data);
        setPodsMemTime(data.time);
        const podsArray = data.pods;
        const keys = ['name', 'namespace',  'node', 'memory_utilization', 'message', 'alarm'];
        
        const pods = podsArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
        setTriggerPodMem(false)
        setPodsMem(pods);
        })
        .catch(error => {
            console.log(error)
        });
    }
  }, [client, namespace, hasTimeElapsed, triggerPodMem]); // *** Note the dependency

  useEffect(() => {
    console.log("CALLED DUE TO CHANGE in fetchPodMemAnalysis");
    if (podsMem.length !== 0 && fetchPodMemAnalysis) {
      var content = JSON.stringify(podsMem);
      content = `What can you tell me about my kubernetes pods memory utilization based on the following json: ${content} \n Return only the analysis and suggestions part"`
      client.analyze(content, assistant).then(result => {
        console.log(result);
        setAssistant(result.assistant);
        setPodMemAnalysis(result.response);
        setIsPodMemFlyoutOpen(true);
        setFetchPodMemAnalysis(false);
        console.log("The response for pods mem is here");
        console.log(result.response)
        })
        .catch(error => {
            console.log(error)
        });
    }
  }, [fetchPodMemAnalysis]); // *** Note the dependency

  useEffect(() => {
    const ns = namespace === 'all' ? undefined : namespace;
    console.log("Get pod cpu before");
    console.log(svcIsDeploy);
    console.log(svcIsDaemon);
    console.log(service);
    console.log(triggerPodCpu);
    const deploy = svcIsDeploy ? service : undefined;
    const daemon = svcIsDaemon ? service : undefined;
    console.log(ns)
    console.log(deploy)
    console.log(daemon)
    if (triggerPodCpu) {
      client.getPodsCpu(undefined, ns, deploy, daemon).then(data => {
        console.log(data);
        setPodsCpuTime(data.time);
        const podsArray = data.pods;
        const keys = ['name', 'namespace',  'node', 'cpu_utilization', 'message', 'alarm'];
        
        const pods = podsArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
        setTriggerPodCpu(false)
        setPodsCpu(pods);
        })
        .catch(error => {
            console.log(error)
        });
    }
  }, [client, namespace, hasTimeElapsed, triggerPodCpu]); // *** Note the dependency


  useEffect(() => {
    console.log("CALLED DUE TO CHANGE in fetchPodCpuAnalysis");
    if (podsCpu.length !== 0 && fetchPodCpuAnalysis) {
      var content = JSON.stringify(podsCpu);
      content = `What can you tell me about my kubernetes pods cpu utilization based on the following json: ${content} \n Return only the analysis and suggestions part"`
      client.analyze(content, assistant).then(result => {
        console.log(result);
        setAssistant(result.assistant);
        setPodCpuAnalysis(result.response);
        setIsPodCpuFlyoutOpen(true);
        setFetchPodCpuAnalysis(false);
        console.log("The response for pods cpu is here");
        console.log(result.response)
        })
        .catch(error => {
            console.log(error)
        });
    }
  }, [fetchPodCpuAnalysis]); // *** Note the dependency

  useEffect(() => {
    const ns = namespace === 'all' ? undefined : namespace;
    console.log("Get pod status before");
    console.log(svcIsDeploy);
    console.log(svcIsDaemon);
    console.log(service);
    const deploy = svcIsDeploy ? service : undefined;
    const daemon = svcIsDaemon ? service : undefined;
    if (triggerPodStatus){
      client.getPodsStatus(undefined, ns, deploy, daemon).then(data => {
        console.log(data);
        setPodsStatusTime(data.time);
        const podsArray = data.pods;
        const keys = ['name', 'namespace', 'status', 'message', 'node', 'failingReason', 'logref'];
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
        setTriggerPodStatus(false);
        })
        .catch(error => {
            console.log(error)
        });
    }
    
  }, [client, namespace, hasTimeElapsed, triggerPodStatus]); // *** Note the dependency


  useEffect(() => {
    console.log("CALLED DUE TO CHANGE in fetchPodStatusAnalysis");
    if (podsStatus.length !== 0 && fetchPodStatusAnalysis) {
      var content = JSON.stringify(podsStatus);
      content = `What can you tell me about my kubernetes pods status based on the following json: ${content} \n Return only the analysis and suggestions part"`
      client.analyze(content, assistant).then(result => {
        console.log(result);
        setAssistant(result.assistant);
        setPodStatusAnalysis(result.response);
        setIsPodStatusFlyoutOpen(true);
        setFetchPodStatusAnalysis(false);
        console.log("The response for pods status is here");
        console.log(result.response)
        })
        .catch(error => {
            console.log(error)
        });
    }
  }, [fetchPodStatusAnalysis]); // *** Note the dependency

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
    },
    {
      field: 'logs',
      name: 'Logs',
      width: '5%',
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
    },
    {
      field: 'logs',
      name: 'Logs',
      width: '5%',
    }
  ]

  const deployStatuscolumns: Array<EuiBasicTableColumn<any>> = [
    {
      field: 'name',
      name: 'Name',
      width: '10%',
    },
    {
      field: 'namespace',
      name: 'Namespace',
      width: '10%',
    },
    {
      field: 'status',
      name: 'Notification',
      width: '10%',
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
      width: '25%',
    },
    {
      field: 'reason',
      name: 'Reason',
      width: '10%',
    },
    {
      field: 'events',
      name: 'Pod Events',
      width: '10%',
    },
    {
      field: 'logs',
      name: 'Logs',
      width: '5%',
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
    },
    {
      field: 'logs',
      name: 'Logs',
      width: '5%',
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
    },
    {
      field: 'logs',
      name: 'Logs',
      width: '5%',
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
    },
    {
      field: 'logs',
      name: 'Logs',
      width: '5%',
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
    },
    {
      field: 'logs',
      name: 'Logs',
      width: '5%',
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
    },
    {
      field: 'logs',
      name: 'Logs',
      width: '5%',
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
    },
    {
      field: 'logs',
      name: 'Logs',
      width: '5%',
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
    },
    {
      field: 'logs',
      name: 'Logs',
      width: '5%',
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
    },
    {
      field: 'logref',
      name: 'Logs',
      width: '5%',
      render: (value: any, item: any) => {
        return (
          <EuiLink href={value} target="_blank">
            Explore Logs
          </EuiLink>
        );    
      },
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
                defaultMessage="Select namespace to filter upon"
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
                  defaultMessage="Application"
                />
              </h4>
            }
            description={
              <FormattedMessage
                id="xpack.k8sobservability.services.selectServiceDesc"
                defaultMessage="Select application to filter upon"
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
        <EuiFlexItem>
          <EuiDescribedFormGroup
            title={
              <h4>
                <FormattedMessage
                  id="xpack.k8sobservability.services.selectPeriodTitle"
                  defaultMessage="Time period"
                />
              </h4>
            }
            description={
              <FormattedMessage
                id="xpack.k8sobservability.services.selectPeriodDesc"
                defaultMessage="Select time range"
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
                valueOfSelected={period}
                fullWidth
                onChange={(id) => setPeriod(id)}
                options={PERIODS_SELECT_OPTIONS}
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
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiText textAlign="left" size="s"><b>Timestamp</b>: {nodeMemtime}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
              <div style={{ width: 900 }}>
                <EuiButton
                        onClick={() => setIsNodesMemFlyoutOpen(true)}
                        isDisabled={nodeMemAnalysis===""}
                        size={'s'}
                        color="primary"
                      >
                        <FormattedMessage
                          id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                          defaultMessage="Analyze Results"
                        />
                  </EuiButton>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
            {isNodesMemFlyoutOpen && (
            <EuiPortal>
              <EuiFlyout onClose={() => setIsNodesMemFlyoutOpen(false)} size="l" maxWidth={1000}>
                <EuiFlyoutHeader hasBorder>
                  <EuiTitle size="m">
                    <h2>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.jsonFlyoutTitle"
                        defaultMessage="Nodes Memory Utilization Analysis"
                      />
                    </h2>
                  </EuiTitle>
                </EuiFlyoutHeader>
                <EuiFlyoutBody>
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.jsonFlyoutDescription"
                        defaultMessage="The analysis below is provided by Azure Openai gpt-4o version 2024-05-01-preview"
                      />
                    </p>
                  </EuiText>
                  <EuiSpacer />
                  <EuiCodeBlock language="html" isCopyable fontSize="l" whiteSpace="pre" paddingSize="l">
                    {nodeMemAnalysis}
                  </EuiCodeBlock>
                </EuiFlyoutBody>
                <EuiFlyoutFooter>
                  <EuiFlexGroup justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty onClick={() => setIsNodesMemFlyoutOpen(false)} flush="left">
                        <FormattedMessage
                          id="xpack.fleet.agentDetails.agentDetailsJsonFlyoutCloseButtonLabel"
                          defaultMessage="Close"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlyoutFooter>
            </EuiFlyout>
            </EuiPortal>
          )}
            <EuiSpacer size="m" />
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
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiText textAlign="left" size="s"><b>Timestamp</b>: {nodeCpuTime}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
              <div style={{ width: 900 }}>
                <EuiButton
                        onClick={() => setIsNodesCpuFlyoutOpen(true)}
                        isDisabled={nodeCpuAnalysis===""}
                        size={'s'}
                        color="primary"
                      >
                        <FormattedMessage
                          id="xpack.aiops.changePointDetection.viewnodecpuanalysis"
                          defaultMessage="Analyze Results"
                        />
                  </EuiButton>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
            {isNodesCpuFlyoutOpen && (
            <EuiPortal>
              <EuiFlyout onClose={() => setIsNodesCpuFlyoutOpen(false)} size="l" maxWidth={1000}>
                <EuiFlyoutHeader hasBorder>
                  <EuiTitle size="m">
                    <h2>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.nodecpuanalysFlyoutTitle"
                        defaultMessage="Nodes Cpu Utilization Analysis"
                      />
                    </h2>
                  </EuiTitle>
                </EuiFlyoutHeader>
                <EuiFlyoutBody>
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.nodecpuanalysFlyoutDescription"
                        defaultMessage="The analysis below is provided by Azure Openai gpt-4o version 2024-05-01-preview"
                      />
                    </p>
                  </EuiText>
                  <EuiSpacer />
                  <EuiCodeBlock language="html" isCopyable fontSize="l" whiteSpace="pre" paddingSize="l">
                    {nodeCpuAnalysis}
                  </EuiCodeBlock>
                </EuiFlyoutBody>
                <EuiFlyoutFooter>
                  <EuiFlexGroup justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty onClick={() => setIsNodesCpuFlyoutOpen(false)} flush="left">
                        <FormattedMessage
                          id="xpack.fleet.agentDetails.nodecpuanalysFlyoutCloseButtonLabel"
                          defaultMessage="Close"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlyoutFooter>
            </EuiFlyout>
            </EuiPortal>
            )}
            <EuiSpacer size="m" />
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
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiText textAlign="left" size="s"><b>Timestamp</b>: {deploysStatusTime}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
              <div style={{ width: 900 }}>
                <EuiButton
                        onClick={() => setFetchDeployStatusAnalysis(true)}
                        isDisabled={deploysStatus.length===0}
                        size={'s'}
                        color="primary"
                      >
                        <FormattedMessage
                          id="xpack.aiops.changePointDetection.viewdeploystatusanalysis"
                          defaultMessage="Analyze Results"
                        />
                  </EuiButton>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
            {isDeployStatusFlyoutOpen && (
            <EuiPortal>
              <EuiFlyout onClose={() => setIsDeployStatusFlyoutOpen(false)} size="l" maxWidth={1000}>
                <EuiFlyoutHeader hasBorder>
                  <EuiTitle size="m">
                    <h2>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.deploystatusanalysFlyoutTitle"
                        defaultMessage="Deployments Status Analysis"
                      />
                    </h2>
                  </EuiTitle>
                </EuiFlyoutHeader>
                <EuiFlyoutBody>
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.deploystatusanalysFlyoutDescription"
                        defaultMessage="The analysis below is provided by Azure Openai gpt-4o version 2024-05-01-preview"
                      />
                    </p>
                  </EuiText>
                  <EuiSpacer />
                  <EuiCodeBlock language="html" isCopyable fontSize="l" whiteSpace="pre" paddingSize="l">
                    {deployStatusAnalysis}
                  </EuiCodeBlock>
                </EuiFlyoutBody>
                <EuiFlyoutFooter>
                  <EuiFlexGroup justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty onClick={() => setIsDeployStatusFlyoutOpen(false)} flush="left">
                        <FormattedMessage
                          id="xpack.fleet.agentDetails.deploystatusanalysFlyoutCloseButtonLabel"
                          defaultMessage="Close"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlyoutFooter>
            </EuiFlyout>
            </EuiPortal>
            )}
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
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiText textAlign="left" size="s"><b>Timestamp</b>: {daemonsStatusTime}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
              <div style={{ width: 900 }}>
                <EuiButton
                        onClick={() => setFetchDaemonStatusAnalysis(true)}
                        isDisabled={daemonsStatus.length===0}
                        size={'s'}
                        color="primary"
                      >
                        <FormattedMessage
                          id="xpack.aiops.changePointDetection.viewdaemonstatusanalysis"
                          defaultMessage="Analyze Results"
                        />
                  </EuiButton>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
            {isDaemonStatusFlyoutOpen && (
            <EuiPortal>
              <EuiFlyout onClose={() => setIsDaemonStatusFlyoutOpen(false)} size="l" maxWidth={1000}>
                <EuiFlyoutHeader hasBorder>
                  <EuiTitle size="m">
                    <h2>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.daemonstatusanalysFlyoutTitle"
                        defaultMessage="Daemonsets Status Analysis"
                      />
                    </h2>
                  </EuiTitle>
                </EuiFlyoutHeader>
                <EuiFlyoutBody>
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.daemonstatusanalysFlyoutDescription"
                        defaultMessage="The analysis below is provided by Azure Openai gpt-4o version 2024-05-01-preview"
                      />
                    </p>
                  </EuiText>
                  <EuiSpacer />
                  <EuiCodeBlock language="html" isCopyable fontSize="l" whiteSpace="pre" paddingSize="l">
                    {daemonStatusAnalysis}
                  </EuiCodeBlock>
                </EuiFlyoutBody>
                <EuiFlyoutFooter>
                  <EuiFlexGroup justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty onClick={() => setIsDaemonStatusFlyoutOpen(false)} flush="left">
                        <FormattedMessage
                          id="xpack.fleet.agentDetails.daemonstatusanalysFlyoutCloseButtonLabel"
                          defaultMessage="Close"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlyoutFooter>
            </EuiFlyout>
            </EuiPortal>
            )}
            <EuiSpacer size="m" />
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
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiText textAlign="left" size="s"><b>Timestamp</b>: {deploysMemTime}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
              <div style={{ width: 900 }}>
                <EuiButton
                        onClick={() => setFetchDeployMemAnalysis(true)}
                        isDisabled={deploysMem.length===0}
                        size={'s'}
                        color="primary"
                      >
                        <FormattedMessage
                          id="xpack.aiops.changePointDetection.viewdeploymemanalysis"
                          defaultMessage="Analyze Results"
                        />
                  </EuiButton>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
            {isDeployMemFlyoutOpen && (
            <EuiPortal>
              <EuiFlyout onClose={() => setIsDeployMemFlyoutOpen(false)} size="l" maxWidth={1000}>
                <EuiFlyoutHeader hasBorder>
                  <EuiTitle size="m">
                    <h2>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.deploymemanalysFlyoutTitle"
                        defaultMessage="Deployments Memory Analysis"
                      />
                    </h2>
                  </EuiTitle>
                </EuiFlyoutHeader>
                <EuiFlyoutBody>
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.deploymemanalysFlyoutDescription"
                        defaultMessage="The analysis below is provided by Azure Openai gpt-4o version 2024-05-01-preview"
                      />
                    </p>
                  </EuiText>
                  <EuiSpacer />
                  <EuiCodeBlock language="html" isCopyable fontSize="l" whiteSpace="pre" paddingSize="l">
                    {deployMemAnalysis}
                  </EuiCodeBlock>
                </EuiFlyoutBody>
                <EuiFlyoutFooter>
                  <EuiFlexGroup justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty onClick={() => setIsDeployMemFlyoutOpen(false)} flush="left">
                        <FormattedMessage
                          id="xpack.fleet.agentDetails.deploymemanalysFlyoutCloseButtonLabel"
                          defaultMessage="Close"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlyoutFooter>
            </EuiFlyout>
            </EuiPortal>
            )}
            <EuiSpacer size="m" />
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
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiText textAlign="left" size="s"><b>Timestamp</b>: {deploysCpuTime}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
              <div style={{ width: 900 }}>
                <EuiButton
                        onClick={() => setFetchDeployCpuAnalysis(true)}
                        isDisabled={deploysCpu.length===0}
                        size={'s'}
                        color="primary"
                      >
                        <FormattedMessage
                          id="xpack.aiops.changePointDetection.viewdeploycpuanalysis"
                          defaultMessage="Analyze Results"
                        />
                  </EuiButton>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
            {isDeployCpuFlyoutOpen && (
            <EuiPortal>
              <EuiFlyout onClose={() => setIsDeployCpuFlyoutOpen(false)} size="l" maxWidth={1000}>
                <EuiFlyoutHeader hasBorder>
                  <EuiTitle size="m">
                    <h2>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.deploycpuanalysFlyoutTitle"
                        defaultMessage="Deployments Cpu Analysis"
                      />
                    </h2>
                  </EuiTitle>
                </EuiFlyoutHeader>
                <EuiFlyoutBody>
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.deploycpuanalysFlyoutDescription"
                        defaultMessage="The analysis below is provided by Azure Openai gpt-4o version 2024-05-01-preview"
                      />
                    </p>
                  </EuiText>
                  <EuiSpacer />
                  <EuiCodeBlock language="html" isCopyable fontSize="l" whiteSpace="pre" paddingSize="l">
                    {deployCpuAnalysis}
                  </EuiCodeBlock>
                </EuiFlyoutBody>
                <EuiFlyoutFooter>
                  <EuiFlexGroup justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty onClick={() => setIsDeployCpuFlyoutOpen(false)} flush="left">
                        <FormattedMessage
                          id="xpack.fleet.agentDetails.deploycpuanalysFlyoutCloseButtonLabel"
                          defaultMessage="Close"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlyoutFooter>
            </EuiFlyout>
            </EuiPortal>
            )}
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
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiText textAlign="left" size="s"><b>Timestamp</b>: {daemonsMemTime}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
              <div style={{ width: 900 }}>
                <EuiButton
                        onClick={() => setFetchDaemonMemAnalysis(true)}
                        isDisabled={daemonsMem.length===0}
                        size={'s'}
                        color="primary"
                      >
                        <FormattedMessage
                          id="xpack.aiops.changePointDetection.viewdaemonmemanalysis"
                          defaultMessage="Analyze Results"
                        />
                  </EuiButton>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
            {isDaemonMemFlyoutOpen && (
            <EuiPortal>
              <EuiFlyout onClose={() => setIsDaemonMemFlyoutOpen(false)} size="l" maxWidth={1000}>
                <EuiFlyoutHeader hasBorder>
                  <EuiTitle size="m">
                    <h2>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.daemonmemanalysFlyoutTitle"
                        defaultMessage="Daemonsets Memory Analysis"
                      />
                    </h2>
                  </EuiTitle>
                </EuiFlyoutHeader>
                <EuiFlyoutBody>
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.daemonmemanalysFlyoutDescription"
                        defaultMessage="The analysis below is provided by Azure Openai gpt-4o version 2024-05-01-preview"
                      />
                    </p>
                  </EuiText>
                  <EuiSpacer />
                  <EuiCodeBlock language="html" isCopyable fontSize="l" whiteSpace="pre" paddingSize="l">
                    {daemonMemAnalysis}
                  </EuiCodeBlock>
                </EuiFlyoutBody>
                <EuiFlyoutFooter>
                  <EuiFlexGroup justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty onClick={() => setIsDaemonMemFlyoutOpen(false)} flush="left">
                        <FormattedMessage
                          id="xpack.fleet.agentDetails.daemonmemanalysFlyoutCloseButtonLabel"
                          defaultMessage="Close"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlyoutFooter>
            </EuiFlyout>
            </EuiPortal>
            )}
            <EuiSpacer size="m" />
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
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiText textAlign="left" size="s"><b>Timestamp</b>: {daemonsCpuTime}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
              <div style={{ width: 900 }}>
                <EuiButton
                        onClick={() => setFetchDaemonCpuAnalysis(true)}
                        isDisabled={daemonsCpu.length===0}
                        size={'s'}
                        color="primary"
                      >
                        <FormattedMessage
                          id="xpack.aiops.changePointDetection.viewdaemoncpuanalysis"
                          defaultMessage="Analyze Results"
                        />
                  </EuiButton>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
            {isDaemonCpuFlyoutOpen && (
            <EuiPortal>
              <EuiFlyout onClose={() => setIsDaemonCpuFlyoutOpen(false)} size="l" maxWidth={1000}>
                <EuiFlyoutHeader hasBorder>
                  <EuiTitle size="m">
                    <h2>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.daemoncpuanalysFlyoutTitle"
                        defaultMessage="Daemonsets Cpu Analysis"
                      />
                    </h2>
                  </EuiTitle>
                </EuiFlyoutHeader>
                <EuiFlyoutBody>
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.daemoncpuanalysFlyoutDescription"
                        defaultMessage="The analysis below is provided by Azure Openai gpt-4o version 2024-05-01-preview"
                      />
                    </p>
                  </EuiText>
                  <EuiSpacer />
                  <EuiCodeBlock language="html" isCopyable fontSize="l" whiteSpace="pre" paddingSize="l">
                    {daemonCpuAnalysis}
                  </EuiCodeBlock>
                </EuiFlyoutBody>
                <EuiFlyoutFooter>
                  <EuiFlexGroup justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty onClick={() => setIsDaemonCpuFlyoutOpen(false)} flush="left">
                        <FormattedMessage
                          id="xpack.fleet.agentDetails.daemoncpuanalysFlyoutCloseButtonLabel"
                          defaultMessage="Close"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlyoutFooter>
            </EuiFlyout>
            </EuiPortal>
            )}
            <EuiSpacer size="m" />
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
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiText textAlign="left" size="s"><b>Timestamp</b>: {podsMemTime}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
              <div style={{ width: 900 }}>
                <EuiButton
                        onClick={() => setFetchPodMemAnalysis(true)}
                        isDisabled={podsMem.length===0}
                        size={'s'}
                        color="primary"
                      >
                        <FormattedMessage
                          id="xpack.aiops.changePointDetection.viewpodmemanalysis"
                          defaultMessage="Analyze Results"
                        />
                  </EuiButton>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
            {isPodMemFlyoutOpen && (
            <EuiPortal>
              <EuiFlyout onClose={() => setIsPodMemFlyoutOpen(false)} size="l" maxWidth={1000}>
                <EuiFlyoutHeader hasBorder>
                  <EuiTitle size="m">
                    <h2>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.podmemanalysFlyoutTitle"
                        defaultMessage="Pods Memory Analysis"
                      />
                    </h2>
                  </EuiTitle>
                </EuiFlyoutHeader>
                <EuiFlyoutBody>
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.podmemanalysFlyoutDescription"
                        defaultMessage="The analysis below is provided by Azure Openai gpt-4o version 2024-05-01-preview"
                      />
                    </p>
                  </EuiText>
                  <EuiSpacer />
                  <EuiCodeBlock language="html" isCopyable fontSize="l" whiteSpace="pre" paddingSize="l">
                    {podMemAnalysis}
                  </EuiCodeBlock>
                </EuiFlyoutBody>
                <EuiFlyoutFooter>
                  <EuiFlexGroup justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty onClick={() => setIsPodMemFlyoutOpen(false)} flush="left">
                        <FormattedMessage
                          id="xpack.fleet.agentDetails.podmemanalysFlyoutCloseButtonLabel"
                          defaultMessage="Close"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlyoutFooter>
            </EuiFlyout>
            </EuiPortal>
            )}
            <EuiSpacer size="m" />
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
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiText textAlign="left" size="s"><b>Timestamp</b>: {podsCpuTime}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
              <div style={{ width: 900 }}>
                <EuiButton
                        onClick={() => setFetchPodCpuAnalysis(true)}
                        isDisabled={podsCpu.length===0}
                        size={'s'}
                        color="primary"
                      >
                        <FormattedMessage
                          id="xpack.aiops.changePointDetection.viewpodcpuanalysis"
                          defaultMessage="Analyze Results"
                        />
                  </EuiButton>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
            {isPodCpuFlyoutOpen && (
            <EuiPortal>
              <EuiFlyout onClose={() => setIsPodCpuFlyoutOpen(false)} size="l" maxWidth={1000}>
                <EuiFlyoutHeader hasBorder>
                  <EuiTitle size="m">
                    <h2>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.podcpuanalysFlyoutTitle"
                        defaultMessage="Pods Cpu Analysis"
                      />
                    </h2>
                  </EuiTitle>
                </EuiFlyoutHeader>
                <EuiFlyoutBody>
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.podcpuanalysFlyoutDescription"
                        defaultMessage="The analysis below is provided by Azure Openai gpt-4o version 2024-05-01-preview"
                      />
                    </p>
                  </EuiText>
                  <EuiSpacer />
                  <EuiCodeBlock language="html" isCopyable fontSize="l" whiteSpace="pre" paddingSize="l">
                    {podCpuAnalysis}
                  </EuiCodeBlock>
                </EuiFlyoutBody>
                <EuiFlyoutFooter>
                  <EuiFlexGroup justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty onClick={() => setIsPodCpuFlyoutOpen(false)} flush="left">
                        <FormattedMessage
                          id="xpack.fleet.agentDetails.podcpuanalysFlyoutCloseButtonLabel"
                          defaultMessage="Close"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlyoutFooter>
            </EuiFlyout>
            </EuiPortal>
            )}
            <EuiSpacer size="m" />
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
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiText textAlign="left" size="s"><b>Timestamp</b>: {podsStatusTime}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
              <div style={{ width: 900 }}>
                <EuiButton
                        onClick={() => setFetchPodStatusAnalysis(true)}
                        isDisabled={podsStatus.length===0}
                        size={'s'}
                        color="primary"
                      >
                        <FormattedMessage
                          id="xpack.aiops.changePointDetection.viewpodstatusanalysis"
                          defaultMessage="Analyze Results"
                        />
                  </EuiButton>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
            {isPodStatusFlyoutOpen && (
            <EuiPortal>
              <EuiFlyout onClose={() => setIsPodStatusFlyoutOpen(false)} size="l" maxWidth={1000}>
                <EuiFlyoutHeader hasBorder>
                  <EuiTitle size="m">
                    <h2>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.podstatusanalysFlyoutTitle"
                        defaultMessage="Pods Status Analysis"
                      />
                    </h2>
                  </EuiTitle>
                </EuiFlyoutHeader>
                <EuiFlyoutBody>
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.podstatusanalysFlyoutDescription"
                        defaultMessage="The analysis below is provided by Azure Openai gpt-4o version 2024-05-01-preview"
                      />
                    </p>
                  </EuiText>
                  <EuiSpacer />
                  <EuiCodeBlock language="html" isCopyable fontSize="l" whiteSpace="pre" paddingSize="l">
                    {podStatusAnalysis}
                  </EuiCodeBlock>
                </EuiFlyoutBody>
                <EuiFlyoutFooter>
                  <EuiFlexGroup justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty onClick={() => setIsPodStatusFlyoutOpen(false)} flush="left">
                        <FormattedMessage
                          id="xpack.fleet.agentDetails.podstatusanalysFlyoutCloseButtonLabel"
                          defaultMessage="Close"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlyoutFooter>
            </EuiFlyout>
            </EuiPortal>
            )}
            <EuiSpacer size="m" />
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