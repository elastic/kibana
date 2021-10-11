import {
  FullAgentPolicy,
} from "./agent_policy";

export interface FullAgentConfigMap {
  apiVersion: string;
  kind: string;
  metadata: metadata;
  data: FullAgentPolicy
}

interface metadata {
  name: string;
  namespace: string;
  labels: labels;
}

interface labels {
  "k8s-app": string;
}
