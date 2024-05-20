import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { HttpStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

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
        ReactDOM.render(<NodesMemory client={publicK8sObservabilityClient} />, element)
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
}

const  NodesMemory = ({
  client,
}: {
  client?: any;
}) => {

  const [nodesMem, setNodesMem] = useState([]);
  const [time, setTime] = useState([]);
  console.log("called");
  console.log(client);
  useEffect(() => {
    client.getNodesMemory().then(data => {
      console.log(data);
      setTime(data.time);
      const nodesArray = data.nodes;
      
      const nodes = nodesArray?.map((node, i) => (
          <tr key={i}>
            <td>{node.name}</td>
            <td>{node.message}</td> 
            <td>{node.alarm}</td> 
          </tr>
      ));
      console.log(nodes);
      setNodesMem(nodes);
      })
      .catch(error => {
          console.log(error)
      });
  }, [client]); // *** Note the dependency
  return (
      <div>
          <h1>Nodes Memory Info</h1>
          <p>time: {time}</p>
          <table className="w3-table">
            <tr>
            <th>Name</th>
            <th>Message</th>
            <th>Alarm</th>
            </tr>
            {nodesMem}
          </table>
      </div>
  );
}