/* tslint:disable */
import { GraphQLResolveInfo } from 'graphql';

type Resolver<Result, Args = any> = (
  parent: any,
  args: Args,
  context: any,
  info: GraphQLResolveInfo
) => Promise<Result> | Result;

export interface Query {
  allPings: Ping[] /** Get a list of all recorded pings for all monitors */;
}
/** A request sent from a monitor to a host */
export interface Ping {
  timestamp: string /** The timestamp of the ping's creation */;
  beat?: Beat | null /** The agent that recorded the ping */;
  docker?: Docker | null;
  error?: Error | null;
  host?: Host | null;
  http?: HTTP | null;
  icmp?: ICMP | null;
  kubernetes?: Kubernetes | null;
  meta?: Meta | null;
  monitor?: Monitor | null;
  resolve?: Resolve | null;
  socks5?: Socks5 | null;
  tags?: string | null;
  tls?: TLS | null;
}
/** An agent for recording a beat */
export interface Beat {
  hostname?: string | null;
  name?: string | null;
  timezone?: string | null;
  type?: string | null;
}

export interface Docker {
  id?: string | null;
  image?: string | null;
  name?: string | null;
}

export interface Error {
  code?: number | null;
  message?: string | null;
  type?: string | null;
}

export interface Host {
  architecture?: string | null;
  id?: string | null;
  ip?: string | null;
  mac?: string | null;
  name?: string | null;
  os?: OS | null;
}

export interface OS {
  family?: string | null;
  kernel?: string | null;
  platform?: string | null;
  version?: string | null;
}

export interface HTTP {
  response?: StatusCode | null;
  rtt?: HttpRTT | null;
  url?: string | null;
}

export interface StatusCode {
  status_code?: number | null;
}

export interface HttpRTT {
  content?: Duration | null;
  response_header?: Duration | null;
  total?: Duration | null;
  validate?: Duration | null;
  validate_body?: Duration | null;
  write_request?: Duration | null;
}
/** The monitor's status for a ping */
export interface Duration {
  us?: number | null;
}

export interface ICMP {
  requests?: number | null;
  rtt?: number | null;
}

export interface Kubernetes {
  container?: KubernetesContainer | null;
  namespace?: string | null;
  node?: KubernetesNode | null;
  pod?: KubernetesPod | null;
}

export interface KubernetesContainer {
  image?: string | null;
  name?: string | null;
}

export interface KubernetesNode {
  name?: string | null;
}

export interface KubernetesPod {
  name?: string | null;
  uid?: string | null;
}

export interface Meta {
  cloud?: MetaCloud | null;
}

export interface MetaCloud {
  availability_zone?: string | null;
  instance_id?: string | null;
  instance_name?: string | null;
  machine_type?: string | null;
  project_id?: string | null;
  provider?: string | null;
  region?: string | null;
}

export interface Monitor {
  duration?: Duration | null;
  host?: string | null;
  id?: string | null /** The id of the monitor */;
  ip?: string | null /** The IP pinged by the monitor */;
  name?: string | null /** The name of the protocol being monitored */;
  scheme?: string | null /** The protocol scheme of the monitored host */;
  status?: string | null /** The status of the monitored host */;
  type?: string | null /** The type of host being monitored */;
}

export interface Resolve {
  host?: string | null;
  ip?: string | null;
  rtt?: Duration | null;
}

export interface Socks5 {
  rtt?: RTT | null;
}

export interface RTT {
  connect?: Duration | null;
  handshake?: Duration | null;
  validate?: Duration | null;
}

export interface TLS {
  certificate_not_valid_after?: string | null;
  certificate_not_valid_before?: string | null;
  certificates?: string | null;
  rtt?: RTT | null;
}

export interface TCP {
  port?: number | null;
  rtt?: RTT | null;
}

export namespace QueryResolvers {
  export interface Resolvers {
    allPings?: AllPingsResolver /** Get a list of all recorded pings for all monitors */;
  }

  export type AllPingsResolver = Resolver<Ping[], AllPingsArgs>;
  export interface AllPingsArgs {
    sort?: string | null;
    size?: number | null;
  }
}
/** A request sent from a monitor to a host */
export namespace PingResolvers {
  export interface Resolvers {
    timestamp?: TimestampResolver /** The timestamp of the ping's creation */;
    beat?: BeatResolver /** The agent that recorded the ping */;
    docker?: DockerResolver;
    error?: ErrorResolver;
    host?: HostResolver;
    http?: HttpResolver;
    icmp?: IcmpResolver;
    kubernetes?: KubernetesResolver;
    meta?: MetaResolver;
    monitor?: MonitorResolver;
    resolve?: ResolveResolver;
    socks5?: Socks5Resolver;
    tags?: TagsResolver;
    tls?: TlsResolver;
  }

  export type TimestampResolver = Resolver<string>;
  export type BeatResolver = Resolver<Beat | null>;
  export type DockerResolver = Resolver<Docker | null>;
  export type ErrorResolver = Resolver<Error | null>;
  export type HostResolver = Resolver<Host | null>;
  export type HttpResolver = Resolver<HTTP | null>;
  export type IcmpResolver = Resolver<ICMP | null>;
  export type KubernetesResolver = Resolver<Kubernetes | null>;
  export type MetaResolver = Resolver<Meta | null>;
  export type MonitorResolver = Resolver<Monitor | null>;
  export type ResolveResolver = Resolver<Resolve | null>;
  export type Socks5Resolver = Resolver<Socks5 | null>;
  export type TagsResolver = Resolver<string | null>;
  export type TlsResolver = Resolver<TLS | null>;
}
/** An agent for recording a beat */
export namespace BeatResolvers {
  export interface Resolvers {
    hostname?: HostnameResolver;
    name?: NameResolver;
    timezone?: TimezoneResolver;
    type?: TypeResolver;
  }

  export type HostnameResolver = Resolver<string | null>;
  export type NameResolver = Resolver<string | null>;
  export type TimezoneResolver = Resolver<string | null>;
  export type TypeResolver = Resolver<string | null>;
}

export namespace DockerResolvers {
  export interface Resolvers {
    id?: IdResolver;
    image?: ImageResolver;
    name?: NameResolver;
  }

  export type IdResolver = Resolver<string | null>;
  export type ImageResolver = Resolver<string | null>;
  export type NameResolver = Resolver<string | null>;
}

export namespace ErrorResolvers {
  export interface Resolvers {
    code?: CodeResolver;
    message?: MessageResolver;
    type?: TypeResolver;
  }

  export type CodeResolver = Resolver<number | null>;
  export type MessageResolver = Resolver<string | null>;
  export type TypeResolver = Resolver<string | null>;
}

export namespace HostResolvers {
  export interface Resolvers {
    architecture?: ArchitectureResolver;
    id?: IdResolver;
    ip?: IpResolver;
    mac?: MacResolver;
    name?: NameResolver;
    os?: OsResolver;
  }

  export type ArchitectureResolver = Resolver<string | null>;
  export type IdResolver = Resolver<string | null>;
  export type IpResolver = Resolver<string | null>;
  export type MacResolver = Resolver<string | null>;
  export type NameResolver = Resolver<string | null>;
  export type OsResolver = Resolver<OS | null>;
}

export namespace OSResolvers {
  export interface Resolvers {
    family?: FamilyResolver;
    kernel?: KernelResolver;
    platform?: PlatformResolver;
    version?: VersionResolver;
  }

  export type FamilyResolver = Resolver<string | null>;
  export type KernelResolver = Resolver<string | null>;
  export type PlatformResolver = Resolver<string | null>;
  export type VersionResolver = Resolver<string | null>;
}

export namespace HTTPResolvers {
  export interface Resolvers {
    response?: ResponseResolver;
    rtt?: RttResolver;
    url?: UrlResolver;
  }

  export type ResponseResolver = Resolver<StatusCode | null>;
  export type RttResolver = Resolver<HttpRTT | null>;
  export type UrlResolver = Resolver<string | null>;
}

export namespace StatusCodeResolvers {
  export interface Resolvers {
    status_code?: Status_codeResolver;
  }

  export type Status_codeResolver = Resolver<number | null>;
}

export namespace HttpRTTResolvers {
  export interface Resolvers {
    content?: ContentResolver;
    response_header?: Response_headerResolver;
    total?: TotalResolver;
    validate?: ValidateResolver;
    validate_body?: Validate_bodyResolver;
    write_request?: Write_requestResolver;
  }

  export type ContentResolver = Resolver<Duration | null>;
  export type Response_headerResolver = Resolver<Duration | null>;
  export type TotalResolver = Resolver<Duration | null>;
  export type ValidateResolver = Resolver<Duration | null>;
  export type Validate_bodyResolver = Resolver<Duration | null>;
  export type Write_requestResolver = Resolver<Duration | null>;
}
/** The monitor's status for a ping */
export namespace DurationResolvers {
  export interface Resolvers {
    us?: UsResolver;
  }

  export type UsResolver = Resolver<number | null>;
}

export namespace ICMPResolvers {
  export interface Resolvers {
    requests?: RequestsResolver;
    rtt?: RttResolver;
  }

  export type RequestsResolver = Resolver<number | null>;
  export type RttResolver = Resolver<number | null>;
}

export namespace KubernetesResolvers {
  export interface Resolvers {
    container?: ContainerResolver;
    namespace?: NamespaceResolver;
    node?: NodeResolver;
    pod?: PodResolver;
  }

  export type ContainerResolver = Resolver<KubernetesContainer | null>;
  export type NamespaceResolver = Resolver<string | null>;
  export type NodeResolver = Resolver<KubernetesNode | null>;
  export type PodResolver = Resolver<KubernetesPod | null>;
}

export namespace KubernetesContainerResolvers {
  export interface Resolvers {
    image?: ImageResolver;
    name?: NameResolver;
  }

  export type ImageResolver = Resolver<string | null>;
  export type NameResolver = Resolver<string | null>;
}

export namespace KubernetesNodeResolvers {
  export interface Resolvers {
    name?: NameResolver;
  }

  export type NameResolver = Resolver<string | null>;
}

export namespace KubernetesPodResolvers {
  export interface Resolvers {
    name?: NameResolver;
    uid?: UidResolver;
  }

  export type NameResolver = Resolver<string | null>;
  export type UidResolver = Resolver<string | null>;
}

export namespace MetaResolvers {
  export interface Resolvers {
    cloud?: CloudResolver;
  }

  export type CloudResolver = Resolver<MetaCloud | null>;
}

export namespace MetaCloudResolvers {
  export interface Resolvers {
    availability_zone?: Availability_zoneResolver;
    instance_id?: Instance_idResolver;
    instance_name?: Instance_nameResolver;
    machine_type?: Machine_typeResolver;
    project_id?: Project_idResolver;
    provider?: ProviderResolver;
    region?: RegionResolver;
  }

  export type Availability_zoneResolver = Resolver<string | null>;
  export type Instance_idResolver = Resolver<string | null>;
  export type Instance_nameResolver = Resolver<string | null>;
  export type Machine_typeResolver = Resolver<string | null>;
  export type Project_idResolver = Resolver<string | null>;
  export type ProviderResolver = Resolver<string | null>;
  export type RegionResolver = Resolver<string | null>;
}

export namespace MonitorResolvers {
  export interface Resolvers {
    duration?: DurationResolver;
    host?: HostResolver;
    id?: IdResolver /** The id of the monitor */;
    ip?: IpResolver /** The IP pinged by the monitor */;
    name?: NameResolver /** The name of the protocol being monitored */;
    scheme?: SchemeResolver /** The protocol scheme of the monitored host */;
    status?: StatusResolver /** The status of the monitored host */;
    type?: TypeResolver /** The type of host being monitored */;
  }

  export type DurationResolver = Resolver<Duration | null>;
  export type HostResolver = Resolver<string | null>;
  export type IdResolver = Resolver<string | null>;
  export type IpResolver = Resolver<string | null>;
  export type NameResolver = Resolver<string | null>;
  export type SchemeResolver = Resolver<string | null>;
  export type StatusResolver = Resolver<string | null>;
  export type TypeResolver = Resolver<string | null>;
}

export namespace ResolveResolvers {
  export interface Resolvers {
    host?: HostResolver;
    ip?: IpResolver;
    rtt?: RttResolver;
  }

  export type HostResolver = Resolver<string | null>;
  export type IpResolver = Resolver<string | null>;
  export type RttResolver = Resolver<Duration | null>;
}

export namespace Socks5Resolvers {
  export interface Resolvers {
    rtt?: RttResolver;
  }

  export type RttResolver = Resolver<RTT | null>;
}

export namespace RTTResolvers {
  export interface Resolvers {
    connect?: ConnectResolver;
    handshake?: HandshakeResolver;
    validate?: ValidateResolver;
  }

  export type ConnectResolver = Resolver<Duration | null>;
  export type HandshakeResolver = Resolver<Duration | null>;
  export type ValidateResolver = Resolver<Duration | null>;
}

export namespace TLSResolvers {
  export interface Resolvers {
    certificate_not_valid_after?: Certificate_not_valid_afterResolver;
    certificate_not_valid_before?: Certificate_not_valid_beforeResolver;
    certificates?: CertificatesResolver;
    rtt?: RttResolver;
  }

  export type Certificate_not_valid_afterResolver = Resolver<string | null>;
  export type Certificate_not_valid_beforeResolver = Resolver<string | null>;
  export type CertificatesResolver = Resolver<string | null>;
  export type RttResolver = Resolver<RTT | null>;
}

export namespace TCPResolvers {
  export interface Resolvers {
    port?: PortResolver;
    rtt?: RttResolver;
  }

  export type PortResolver = Resolver<number | null>;
  export type RttResolver = Resolver<RTT | null>;
}
export interface AllPingsQueryArgs {
  sort?: string | null;
  size?: number | null;
}
