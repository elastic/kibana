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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

// const [state, setState] = useState<{'NODES'}>({'NODES':{}});


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
  console.log("called");
  console.log(client);
  useEffect(() => {
    client.getNodesMemory().then(data => {
      console.log(data);
      setNodeMemTime(data.time);
      const nodesArray = data.nodes;
      const keys = ['name', 'memory_utilization', 'message', 'alarm'];

      const nodes = nodesArray.map(item => keys.reduce((acc, key) => ({...acc, [key]: item[key]}), {}));
      console.log("AAAAAAAAAAAAAA");
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
      console.log("OOOOOOOOO");
      setNodesCpu(nodes);
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
    <EuiFlexGroup>
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
                name: 'Alarm',
              }
            ]}
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
                name: 'Alarm',
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
      
  );
}