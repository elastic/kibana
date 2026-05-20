export type { ContainerType } from '@kbn/apm-types';
export declare const SERVICE_METADATA_SERVICE_KEYS: ["service.node.name", "service.version", "service.runtime.name", "service.runtime.version"];
export declare const SERVICE_METADATA_CONTAINER_KEYS: ["container.id", "host.name", "kubernetes.pod.uid", "kubernetes.pod.name"];
export declare const SERVICE_METADATA_INFRA_METRICS_KEYS: ["kubernetes.container.name", "kubernetes.namespace", "kubernetes.replicaset.name", "kubernetes.deployment.name"];
export declare const SERVICE_METADATA_CLOUD_KEYS: ["cloud.availability_zone", "cloud.instance.id", "cloud.instance.name", "cloud.machine.type", "cloud.provider"];
export declare const SERVICE_METADATA_KUBERNETES_KEYS: ["kubernetes.container.name", "kubernetes.namespace", "kubernetes.deployment.name", "kubernetes.pod.name", "kubernetes.pod.uid", "kubernetes.replicaset.name"];
