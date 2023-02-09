import murmurhash from 'murmurhash';


function hash(partition: number, podName: string){
  return murmurhash.v3(`${partition}}:${podName}`);
}

// TODO: Optimize. This can almost certainly be optimized...
export function rendezvousHash(podName: string, podNames: string[], partitions: number[], k: number) : number[] {
  const maxes = Array<Array<[string, number]>>();
  for (let i = 0; i < partitions.length; ++i) {
    maxes[i] = new Array();
    for (let ii = 0; ii < k; ++ii) {
      maxes[i][ii] = ['', -1];
    }
  }

  for (let i = 0; i < partitions.length; ++i) {
    for (let ii = 0; ii < podNames.length; ++ii) {
      const calculatedHash = hash(partitions[i], podNames[ii]);
      for (let iii = 0; iii < k; ++iii) {
        if (calculatedHash > maxes[i][iii][1]) {
          maxes[i].pop();
          maxes[i].splice(iii, 0, [podNames[ii], calculatedHash]);
          break;
        }
      }
    }
  }

  const podPartitions = new Array<number>();
  for (let i = 0; i < partitions.length; ++i) {
      for (let iii = 0; iii < k; ++iii) {
        if (maxes[i][iii][0] === podName) {
          podPartitions.push(i);
        }
      }
  }

  return podPartitions;
 }
