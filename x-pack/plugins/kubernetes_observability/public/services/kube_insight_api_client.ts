import { AIQuery, Query } from '../types';
import { HttpStart } from '@kbn/core/public';


export class PublicKubernetesInsightClient {
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