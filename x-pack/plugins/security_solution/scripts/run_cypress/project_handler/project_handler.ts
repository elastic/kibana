import { ToolingLog } from "@kbn/tooling-log";

export interface ProductType {
  product_line: string;
  product_tier: string;
}

export interface OverrideEntry {
  docker_image: string;
}

export interface ProductOverrides {
  kibana?: OverrideEntry;
  elasticsearch?: OverrideEntry;
  fleet?: OverrideEntry;
  cluster?: OverrideEntry;
}

export interface CreateProjectRequestBody {
  name: string;
  region_id: string;
  product_types?: ProductType[];
  overrides?: ProductOverrides;
}

export interface Project {
  name: string;
  id: string;
  region: string;
  es_url: string;
  kb_url: string;
  product: string;
  proxy_id?: number;
  proxy_org_id?: number;
  proxy_org_name?: string;
}

export interface Credentials {
  username: string;
  password: string;
}

export class ProjectHandler {
  baseEnvUrl: string;
  log: ToolingLog;

  constructor(baseEnvUrl: string) {
    this.baseEnvUrl = baseEnvUrl;
    this.log = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });
  }
}
