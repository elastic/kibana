import * as k8s from '@kubernetes/client-node';

function range (start: number, end: number) {
  const nums: number[] = [];
  for (let i = start; i < end; ++i) {
    nums.push(i);
  }
  return nums;
 }

export class TaskPartitioner {
  private readonly allPartitions: number[];
  private readonly k8sNamespace: string;

  constructor(k8sNamespace: string) {
    this.allPartitions = range(0, 360);
    this.k8sNamespace = k8sNamespace;
  }

  async getPartitions() : Promise<number[]> {
    const allPodNames = await this.getAllPodNames();
    console.log({ allPodNames });

    return this.allPartitions;
  }

  private async getAllPodNames() : Promise<string[]> {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

    const services = await k8sApi.listNamespacedService(this.k8sNamespace, undefined, undefined, undefined, undefined, 'kibana.k8s.elastic.co/name=kb');
    if (services.body.items.length !== 1) {
      throw new Error(`Expected to get 1 service, received ${services.body.items.length}`);
    }

    const serviceSelector = services.body.items[0].spec?.selector;
    if (serviceSelector === undefined) {
      throw new Error(`Service's selector is undefined, unable to determine pods that match an empty selector`);
    }
    const podLabelSelector = Object.entries(serviceSelector).map(([key, value]) => `${key}=${value}`).join(',');
    const pods = await k8sApi.listNamespacedPod(this.k8sNamespace, undefined, undefined, undefined, undefined, podLabelSelector);
    return pods.body.items.map(item => {
      if (item.metadata === undefined) {
        throw new Error(`Pod's metadata is undefined, unable to determine name`);
      }

      if (item.metadata.name === undefined) {
        throw new Error(`Pod's metadata.name is undefined, unable to determine name`);
      }

      return item.metadata!.name!;
    });
  }
}
